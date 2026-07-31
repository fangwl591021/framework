import { describe,expect,it } from "vitest";
import { AiGatewayService } from "../src/ai-gateway/application";
import { DeterministicLocalAiAdapter,DisabledOpenAiAdapter,createLocalAiProviderCatalog } from "../src/ai-gateway/adapters";
import { AiGatewayError } from "../src/ai-gateway/models";
import { CacheShortcut,DeterministicRuleShortcut,DisabledKnowledgeShortcut } from "../src/ai-gateway/shortcuts";
import { assertSafeInput,validateAiOutput } from "../src/ai-gateway/validation";
import type { AiGatewayRepository } from "../src/ai-gateway/repository";

const context={source:"trusted_runtime_context" as const,tenantId:"tenant",applicationId:"application",actorMembershipId:"member",correlationId:"correlation",permissionGranted:true,moduleEnabled:true,trafficAdmitted:true};
const service=(repository:Partial<AiGatewayRepository>={})=>new AiGatewayService(repository as AiGatewayRepository,{generate:()=>"019f0000-0000-7000-8000-000000000001"},createLocalAiProviderCatalog(),{record:async()=>{}},()=>1);
const providerRequest={taskKey:"workbench.intent_resolution" as const,taskVersion:1 as const,input:{text:"活動列表"},locale:"zh-TW",maxOutputUnits:512,timeoutMs:10};

describe("AI Gateway acceptance boundaries",()=>{
  it("rejects an unknown registered task",async()=>{await expect(service({getTask:async()=>null,getRequest:async()=>null}).prepareAiRequest({context,taskKey:"unknown" as never,taskVersion:1,input:{text:"x"},idempotencyKey:"unknown-key",locale:"en",qualityTier:"standard",cacheDirective:"bypass",requestedOutputUnits:10,requestedCostMicros:0})).rejects.toMatchObject({code:"AI_TASK_NOT_AVAILABLE"});});
  it("rejects a disabled task",async()=>{await expect(service({getTask:async()=>({task_key:"content.safe_rewrite",task_version:1,status:"disabled",max_input_units:100,max_output_units:100,cache_policy:"disabled"}),getRequest:async()=>null}).prepareAiRequest({context,taskKey:"content.safe_rewrite",taskVersion:1,input:{text:"x"},idempotencyKey:"disabled-key",locale:"en",qualityTier:"standard",cacheDirective:"bypass",requestedOutputUnits:10,requestedCostMicros:0})).rejects.toMatchObject({code:"AI_TASK_NOT_AVAILABLE"});});
  it("rejects an oversized input before persistence",()=>expect(()=>assertSafeInput({text:"x".repeat(9000)})).toThrow(/AI_INPUT_REJECTED/));
  it("rejects an oversized output",()=>expect(()=>validateAiOutput("content.safe_rewrite",{text:"x".repeat(1000)},10)).toThrow(/AI_OUTPUT_INVALID/));
  it("rejects an unallowlisted AI intent",()=>expect(()=>validateAiOutput("workbench.intent_resolution",{intentKey:"internal.admin",confidence:.99,choices:[]},512)).toThrow(/AI_OUTPUT_INVALID/));
  it("accepts an allowlisted structured intent",()=>expect(validateAiOutput("workbench.intent_resolution",{intentKey:"event.list",confidence:.99,choices:[]},512).requiresClarification).toBe(false));
  it("uses exact deterministic shortcut before a provider",async()=>expect(await new DeterministicRuleShortcut().resolve(providerRequest)).toMatchObject({source:"exact_registry",output:{intentKey:"event.list"}}));
  it("keeps cache shortcut persistence-neutral",async()=>expect(await new CacheShortcut().resolve(providerRequest)).toBeNull());
  it("keeps future knowledge lookup disabled",async()=>expect(await new DisabledKnowledgeShortcut().resolve(providerRequest)).toBeNull());
  it("classifies traffic denial before repository access",async()=>{await expect(service().prepareAiRequest({context:{...context,trafficAdmitted:false},taskKey:"content.safe_rewrite",taskVersion:1,input:{text:"x"},idempotencyKey:"traffic-key",locale:"en",qualityTier:"standard",cacheDirective:"bypass",requestedOutputUnits:10,requestedCostMicros:0})).rejects.toMatchObject({code:"AI_TRAFFIC_REJECTED"});});
  it("does not expose arbitrary prompt invocation",()=>expect("invokeArbitraryPrompt" in service()).toBe(false));
  it("does not expose arbitrary model invocation",()=>expect("invokeArbitraryModel" in service()).toBe(false));
  it("does not expose provider URL invocation",()=>expect("invokeProviderUrl" in service()).toBe(false));
  it("disabled provider has no credential or endpoint surface",()=>expect(Object.keys(new DisabledOpenAiAdapter()).join(" ")).not.toMatch(/credential|secret|token|endpoint|url/i));
  it("bounds deterministic provider response through the output validator",async()=>{const result=await new DeterministicLocalAiAdapter().invoke({...providerRequest,taskKey:"content.safe_rewrite",input:{text:"safe"}});expect(validateAiOutput("content.safe_rewrite",result.output,100).output).toEqual({text:"safe"});});
  it("rejects raw secret and UID shaped input keys",()=>{for(const value of [{credential:"raw"},{rawUid:"uid"},{authorization:"bearer"}])expect(()=>assertSafeInput(value)).toThrow(/AI_INPUT_REJECTED/);});
  it("fails closed when no approved provider is usable",async()=>{await expect(service().invokeProvider([{providerKey:"disabled_openai_adapter",modelKey:"disabled",modelVersion:"1"}],{...providerRequest,taskKey:"diagnostics.safe_summary"})).rejects.toBeInstanceOf(AiGatewayError);});
});
