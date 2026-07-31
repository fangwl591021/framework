import { canonicalJson, sha256Hex } from "../persistence/crypto";
import type { UuidV7 } from "../core/uuidv7";
import { AiGatewayError, type AiProviderResult, type AiRoute, type AiUsageSummary, type PrepareAiRequestInput, type PreparedAiRequest, type TrustedAiContext, type ValidatedAiOutput } from "./models";
import type { AiGatewayObservationPort, AiProviderPort } from "./ports";
import { AiGatewayRepository } from "./repository";
import { assertSafeInput, validateAiOutput } from "./validation";

export interface AiExecutionResult extends ValidatedAiOutput { readonly requestId:string; readonly providerKey:string; readonly modelKey:string; readonly cacheOutcome:"hit"|"miss"|"bypass"; }
export class AiGatewayService {
  constructor(private readonly repository:AiGatewayRepository,private readonly ids:UuidV7,private readonly providers:ReadonlyMap<string,AiProviderPort>,private readonly observations:AiGatewayObservationPort,private readonly now:()=>number=Date.now){}
  async prepareAiRequest(input:PrepareAiRequestInput):Promise<PreparedAiRequest>{this.assertTrusted(input.context);assertSafeInput(input.input);if(input.idempotencyKey.length<8||input.idempotencyKey.length>200)throw new AiGatewayError("AI_INPUT_REJECTED");const task=await this.repository.getTask(input.taskKey,input.taskVersion);const canonical=canonicalJson(input.input);const[inputDigest,idempotencyDigest]=await Promise.all([sha256Hex(canonical),sha256Hex(input.idempotencyKey)]);const prior=await this.repository.getRequest(input.context.tenantId,input.context.applicationId,input.taskKey,idempotencyDigest);if(prior){if(prior.inputDigest!==inputDigest)throw new AiGatewayError("AI_IDEMPOTENCY_CONFLICT");return prior;}if(!task||task.status!=="active"||canonical.length>task.max_input_units)throw new AiGatewayError("AI_TASK_NOT_AVAILABLE");const requestId=this.ids.generate();await this.repository.insertRequest({id:requestId,tenantId:input.context.tenantId,applicationId:input.context.applicationId,actorMembershipId:input.context.actorMembershipId,taskKey:input.taskKey,inputDigest,idempotencyDigest,locale:input.locale,qualityTier:input.qualityTier,cacheDirective:input.cacheDirective,inputUnits:canonical.length,outputUnits:input.requestedOutputUnits,costMicros:input.requestedCostMicros,now:this.now()});return{requestId,status:"prepared",replayed:false,storedResult:null,inputDigest};}
  async evaluateAiPolicy(context:TrustedAiContext,taskKey:string,qualityTier:string){this.assertTrusted(context);const route=await this.repository.getRoute(context.tenantId,context.applicationId,taskKey,qualityTier);if(!route)throw new AiGatewayError("AI_POLICY_NOT_AVAILABLE");return route;}
  async claimAiBudget(input:PrepareAiRequestInput,prepared:PreparedAiRequest){try{const now=this.now();await this.repository.claimBudget({leaseIds:[this.ids.generate(),this.ids.generate(),this.ids.generate()],requestId:prepared.requestId,tenantId:input.context.tenantId,applicationId:input.context.applicationId,inputUnits:canonicalJson(input.input).length,outputUnits:input.requestedOutputUnits,costMicros:input.requestedCostMicros,now,expiresAt:now+30000});}catch{await this.observe(input.context,input.taskKey,"ai.budget.exhausted","AI_BUDGET_EXCEEDED");throw new AiGatewayError("AI_BUDGET_EXCEEDED");}}
  async resolveShortcut(input:PrepareAiRequestInput):Promise<Readonly<Record<string,unknown>>|null>{const text=String(input.input.text??"").trim();return input.taskKey==="workbench.clarification_suggestion"&&!text?{text:"請補充要執行的動作。"}:null;}
  selectRoute(routes:readonly AiRoute[]){const unique=new Set(routes.map((r)=>`${r.providerKey}/${r.modelKey}/${r.modelVersion}`));if(routes.length<1||routes.length>2||unique.size!==routes.length)throw new AiGatewayError("AI_POLICY_NOT_AVAILABLE");return routes;}
  async invokeProvider(routes:readonly AiRoute[],request:Parameters<AiProviderPort["invoke"]>[0]):Promise<{result:AiProviderResult;route:AiRoute}>{for(const route of this.selectRoute(routes)){const provider=this.providers.get(route.providerKey);if(!provider?.enabled)continue;try{return{result:await provider.invoke(request),route};}catch{}}throw new AiGatewayError("AI_PROVIDER_FAILED");}
  validateOutput(taskKey:PrepareAiRequestInput["taskKey"],output:Readonly<Record<string,unknown>>,maxOutputUnits:number){return validateAiOutput(taskKey,output,maxOutputUnits);}
  async execute(input: PrepareAiRequestInput): Promise<AiExecutionResult> {
    const prepared = await this.prepareAiRequest(input);
    if (prepared.replayed && prepared.status === "completed" && prepared.storedResult) return prepared.storedResult as unknown as AiExecutionResult;
    const policy = await this.evaluateAiPolicy(input.context, input.taskKey, input.qualityTier);
    const schemaDigest = await sha256Hex(`${input.taskKey}:v1`);
    const routeKey = policy.routes.map((route) => `${route.providerKey}/${route.modelKey}/${route.modelVersion}`).join("|");
    const cacheKey = await sha256Hex([input.context.tenantId, input.context.applicationId, input.taskKey, "1", prepared.inputDigest, schemaDigest, input.locale, String(policy.policyVersion), routeKey].join("|"));
    await this.claimAiBudget(input, prepared);
    if (input.cacheDirective === "allow" && policy.cacheAllowed) {
      const hit = await this.repository.getCache(input.context.tenantId, input.context.applicationId, cacheKey, this.now());
      if (hit) {
        const validated = JSON.parse(hit.response_json) as ValidatedAiOutput;
        const route = this.selectRoute(policy.routes)[0];
        if (!route) throw new AiGatewayError("AI_POLICY_NOT_AVAILABLE");
        const result: AiExecutionResult = { requestId: prepared.requestId, ...validated, providerKey: route.providerKey, modelKey: route.modelKey, cacheOutcome: "hit" };
        await this.completeUsage(input, prepared, { result: { output: validated.output, inputUnits: 0, outputUnits: 0, latencyMs: 0 }, route }, result, policy);
        return result;
      }
    }
    const shortcut = await this.resolveShortcut(input);
    const invoked = shortcut
      ? { result: { output: shortcut, inputUnits: 0, outputUnits: JSON.stringify(shortcut).length, latencyMs: 0 }, route: { providerKey: "deterministic_local_adapter", modelKey: "deterministic-fixture", modelVersion: "1" } }
      : await this.invokeProvider(policy.routes, { taskKey: input.taskKey, taskVersion: 1, input: input.input, locale: input.locale, maxOutputUnits: input.requestedOutputUnits, timeoutMs: policy.maxLatencyMs });
    const validated = this.validateOutput(input.taskKey, invoked.result.output, input.requestedOutputUnits);
    const result: AiExecutionResult = { requestId: prepared.requestId, ...validated, providerKey: invoked.route.providerKey, modelKey: invoked.route.modelKey, cacheOutcome: input.cacheDirective === "bypass" ? "bypass" : "miss" };
    await this.completeUsage(input, prepared, invoked, result, policy);
    if (input.cacheDirective === "allow" && policy.cacheAllowed) await this.repository.putCache({ cacheKey, tenantId: input.context.tenantId, applicationId: input.context.applicationId, taskKey: input.taskKey, inputDigest: prepared.inputDigest, schemaDigest, locale: input.locale, policyVersion: policy.policyVersion, routeKey, responseDigest: await sha256Hex(canonicalJson(validated)), response: validated as unknown as Readonly<Record<string, unknown>>, expiresAt: this.now() + 3600000, now: this.now() });
    await this.observe(input.context, input.taskKey, "ai.request.completed", "AI_COMPLETED");
    return result;
  }
  async completeUsage(input:PrepareAiRequestInput,prepared:PreparedAiRequest,invoked:{result:AiProviderResult;route:AiRoute},result:AiExecutionResult,policy:{policyId:string;policyVersion:number}){await this.repository.complete({usageId:this.ids.generate(),requestId:prepared.requestId,tenantId:input.context.tenantId,applicationId:input.context.applicationId,actorMembershipId:input.context.actorMembershipId,taskKey:input.taskKey,route:invoked.route,routePolicyId:policy.policyId,routePolicyVersion:policy.policyVersion,inputUnits:invoked.result.inputUnits,outputUnits:invoked.result.outputUnits,costMicros:input.requestedCostMicros,cacheOutcome:result.cacheOutcome,latencyMs:invoked.result.latencyMs,result:result as unknown as Readonly<Record<string,unknown>>,now:this.now()});}
  getAiRequestStatus(tenantId:string,applicationId:string,taskKey:string,idempotencyDigest:string){return this.repository.getRequest(tenantId,applicationId,taskKey,idempotencyDigest);}
  listUsageSummary(context:TrustedAiContext):Promise<AiUsageSummary>{this.assertTrusted(context);return this.repository.usageSummary(context.tenantId,context.applicationId);}
  private assertTrusted(context:TrustedAiContext){if(context.source!=="trusted_runtime_context")throw new AiGatewayError("AI_UNTRUSTED_CONTEXT");if(!context.trafficAdmitted)throw new AiGatewayError("AI_TRAFFIC_REJECTED");if(!context.moduleEnabled)throw new AiGatewayError("AI_MODULE_NOT_ENABLED");if(!context.permissionGranted)throw new AiGatewayError("AI_PERMISSION_DENIED");}
  private async observe(context:TrustedAiContext,taskKey:string,eventType:Parameters<AiGatewayObservationPort["record"]>[0]["eventType"],reasonCode:string){try{await this.observations.record({eventType,tenantId:context.tenantId,applicationId:context.applicationId,taskKey,reasonCode,correlationId:context.correlationId});}catch{}}
}
