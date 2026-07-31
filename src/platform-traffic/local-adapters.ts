import type { UuidV7 } from "../core/uuidv7";
import { TrafficProtectionError } from "./errors";
import type {
  AcceptedOperationReceipt,
  AdmissionSheddingDecision,
  CircuitBreakerDecision,
  CircuitBreakerPolicy,
  CircuitBreakerState,
  DegradationMode,
  LoadSheddingPolicy,
  RateLimitDecision,
  RateLimitPolicy,
  ResourceIsolationDecision,
  TenantAdmissionBudget,
  TenantResourceUsageSnapshot,
  TrafficObservation,
  TrustedAdmissionContext,
  WebhookEventFingerprint,
  WebhookReceiptRecord,
  WebhookReplayResult,
} from "./models";
import type {
  CircuitBreakerPort,
  LoadSheddingPort,
  RateLimiterPort,
  TenantResourceIsolationPort,
  TrafficObservationPort,
  TrafficReadinessPort,
  WebhookDeduplicationPort,
} from "./ports";

const MAX_COUNTER = 1_000_000_000;

export function boundedIncrement(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value >= MAX_COUNTER) {
    throw new TrafficProtectionError("DEPENDENCY_UNAVAILABLE", false);
  }
  return value + 1;
}

function assertDigest(value: string | null, name: string): void {
  if (value !== null && !/^digest:[0-9a-f]{64}$/.test(value)) {
    throw new TypeError(`${name} must be a trusted digest`);
  }
}

function assertTrustedContext(context: TrustedAdmissionContext): void {
  if (context.source !== "trusted_runtime_context") {
    throw new TypeError("UNTRUSTED_ADMISSION_CONTEXT");
  }
  if (!context.tenantId || !context.moduleKey || !context.routeKey) {
    throw new TypeError("INVALID_ADMISSION_CONTEXT");
  }
  assertDigest(context.actorDigest, "actorDigest");
  assertDigest(context.ipDigest, "ipDigest");
}

function rateKey(context: TrustedAdmissionContext): string {
  assertTrustedContext(context);
  return [
    context.environment,
    context.tenantId,
    context.applicationId ?? "tenant",
    context.moduleKey,
    context.routeKey,
    context.actorDigest ?? "anonymous",
    context.ipDigest ?? "no-ip",
  ].join("|");
}

interface WindowCounter {
  startedAt: number;
  count: number;
  blockedUntil: number;
}

export class LocalSlidingWindowRateLimiter implements RateLimiterPort {
  private readonly counters = new Map<string, WindowCounter>();

  constructor(
    private readonly now: () => number,
    private readonly policy: RateLimitPolicy,
  ) {
    if (
      !Number.isInteger(policy.limit) || policy.limit < 1 || policy.limit > 1_000_000
      || !Number.isInteger(policy.burst) || policy.burst < 0 || policy.burst > policy.limit
      || policy.windowMs < 100 || policy.windowMs > 86_400_000
      || policy.cooldownMs < 0 || policy.cooldownMs > 604_800_000
    ) {
      throw new TypeError("INVALID_RATE_LIMIT_POLICY");
    }
  }

  async evaluate(context: TrustedAdmissionContext): Promise<RateLimitDecision> {
    const key = rateKey(context);
    const timestamp = this.now();
    const prior = this.counters.get(key);
    const current = !prior || timestamp - prior.startedAt >= this.policy.windowMs
      ? { startedAt: timestamp, count: 0, blockedUntil: 0 }
      : prior;
    const capacity = this.policy.limit + this.policy.burst;
    if (timestamp < current.blockedUntil || current.count >= capacity) {
      current.blockedUntil = Math.max(
        current.blockedUntil,
        current.startedAt + this.policy.windowMs + this.policy.cooldownMs,
      );
      this.counters.set(key, current);
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.blockedUntil - timestamp) / 1000),
      );
      return Object.freeze({
        admitted: this.policy.enforcementMode === "observe",
        observedOnly: this.policy.enforcementMode === "observe",
        retryAfterSeconds,
        reasonCode: "RATE_LIMITED",
      });
    }
    current.count = boundedIncrement(current.count);
    this.counters.set(key, current);
    return Object.freeze({
      admitted: true,
      observedOnly: false,
      retryAfterSeconds: null,
      reasonCode: "RATE_LIMIT_OK",
    });
  }
}

export class LocalHierarchicalRateLimiter implements RateLimiterPort {
  private readonly tenantCounters = new Map<string, WindowCounter>();
  private readonly platformCounters = new Map<string, WindowCounter>();
  constructor(private readonly now:()=>number,private readonly tenantPolicy:RateLimitPolicy,private readonly platformPolicy:RateLimitPolicy) {}
  async evaluate(context:TrustedAdmissionContext):Promise<RateLimitDecision>{
    const timestamp=this.now();
    const tenantKey=rateKey(context);
    const platformKey=[context.environment,context.routeKey,context.moduleKey].join("|");
    const tenant=this.current(this.tenantCounters.get(tenantKey),timestamp,this.tenantPolicy);
    const platform=this.current(this.platformCounters.get(platformKey),timestamp,this.platformPolicy);
    const tenantBlocked=this.blocked(tenant,timestamp,this.tenantPolicy);
    const platformBlocked=this.blocked(platform,timestamp,this.platformPolicy);
    if(tenantBlocked&&this.tenantPolicy.enforcementMode==="enforce"){this.tenantCounters.set(tenantKey,tenant);return this.rejected(tenant,timestamp,"TENANT_RATE_LIMITED");}
    if(platformBlocked&&this.platformPolicy.enforcementMode==="enforce"){this.platformCounters.set(platformKey,platform);return this.rejected(platform,timestamp,"PLATFORM_RATE_LIMITED");}
    if(!tenantBlocked){tenant.count=boundedIncrement(tenant.count);this.tenantCounters.set(tenantKey,tenant);}
    if(!platformBlocked){platform.count=boundedIncrement(platform.count);this.platformCounters.set(platformKey,platform);}
    return Object.freeze({admitted:true,observedOnly:tenantBlocked||platformBlocked,retryAfterSeconds:null,reasonCode:"RATE_LIMIT_OK"});
  }
  private current(prior:WindowCounter|undefined,timestamp:number,policy:RateLimitPolicy):WindowCounter{return !prior||timestamp-prior.startedAt>=policy.windowMs?{startedAt:timestamp,count:0,blockedUntil:0}:prior;}
  private blocked(counter:WindowCounter,timestamp:number,policy:RateLimitPolicy):boolean{if(timestamp<counter.blockedUntil||counter.count>=policy.limit+policy.burst){counter.blockedUntil=Math.max(counter.blockedUntil,counter.startedAt+policy.windowMs+policy.cooldownMs);return true;}return false;}
  private rejected(counter:WindowCounter,timestamp:number,reasonCode:"TENANT_RATE_LIMITED"|"PLATFORM_RATE_LIMITED"):RateLimitDecision{return Object.freeze({admitted:false,observedOnly:false,retryAfterSeconds:Math.max(1,Math.ceil((counter.blockedUntil-timestamp)/1000)),reasonCode});}
}

interface ResourceWindow extends TenantResourceUsageSnapshot {
  startedAt: number;
}

const EMPTY_USAGE: TenantResourceUsageSnapshot = Object.freeze({
  concurrentRequests: 0,
  requestsPerWindow: 0,
  expensiveMutationsPerWindow: 0,
  backgroundIntentsPerWindow: 0,
  providerCallsPerWindow: 0,
  databaseWritesPerWindow: 0,
});

export class LocalTenantResourceIsolation implements TenantResourceIsolationPort {
  private readonly tenantUsage = new Map<string, ResourceWindow>();
  private readonly leases = new Map<string, { tenantId: string; expiresAt: number }>();
  private platformUsage: ResourceWindow = { ...EMPTY_USAGE, startedAt: 0 };
  private leaseSequence = 0;
  constructor(private readonly now: () => number, private readonly budget: TenantAdmissionBudget, private readonly leaseMs = 30_000) {}

  async evaluate(context: TrustedAdmissionContext): Promise<ResourceIsolationDecision> {
    assertTrustedContext(context); const timestamp=this.now(); this.expireLeases(timestamp);
    const tenant=this.window(this.tenantUsage.get(context.tenantId),timestamp,this.budget.tenant.windowMs);
    this.platformUsage=this.window(this.platformUsage,timestamp,this.budget.platform.windowMs);
    if(this.exceeds(tenant,this.budget.tenant,context,0)){this.tenantUsage.set(context.tenantId,tenant);return Object.freeze({admitted:false,reasonCode:"TENANT_BUDGET_EXHAUSTED",retryAfterSeconds:1,leaseToken:null});}
    const reserve=context.priority==="critical"?1:0;
    if(this.exceeds(this.platformUsage,this.budget.platform,context,reserve))return Object.freeze({admitted:false,reasonCode:"PLATFORM_BUDGET_EXHAUSTED",retryAfterSeconds:1,leaseToken:null});
    const leaseToken=`resource-lease-${++this.leaseSequence}`;
    this.tenantUsage.set(context.tenantId,this.increment(tenant,context)); this.platformUsage=this.increment(this.platformUsage,context);
    this.leases.set(leaseToken,{tenantId:context.tenantId,expiresAt:timestamp+this.leaseMs});
    return Object.freeze({admitted:true,reasonCode:"RESOURCE_OK",retryAfterSeconds:null,leaseToken});
  }
  snapshot(tenantId:string):TenantResourceUsageSnapshot { const u=this.tenantUsage.get(tenantId)??{...EMPTY_USAGE,startedAt:0}; return Object.freeze({concurrentRequests:u.concurrentRequests,requestsPerWindow:u.requestsPerWindow,expensiveMutationsPerWindow:u.expensiveMutationsPerWindow,backgroundIntentsPerWindow:u.backgroundIntentsPerWindow,providerCallsPerWindow:u.providerCallsPerWindow,databaseWritesPerWindow:u.databaseWritesPerWindow}); }
  async release(leaseToken:string):Promise<void>{const lease=this.leases.get(leaseToken);if(!lease)return;this.leases.delete(leaseToken);this.decrementConcurrency(lease.tenantId);}
  private expireLeases(now:number){for(const [token,lease] of this.leases){if(lease.expiresAt<=now){this.leases.delete(token);this.decrementConcurrency(lease.tenantId);}}}
  private decrementConcurrency(tenantId:string){const u=this.tenantUsage.get(tenantId);if(u)this.tenantUsage.set(tenantId,{...u,concurrentRequests:Math.max(0,u.concurrentRequests-1)});this.platformUsage={...this.platformUsage,concurrentRequests:Math.max(0,this.platformUsage.concurrentRequests-1)};}
  private window(existing:ResourceWindow|undefined,timestamp:number,windowMs:number):ResourceWindow{return !existing||timestamp-existing.startedAt>=windowMs?{...EMPTY_USAGE,startedAt:timestamp}:existing;}
  private exceeds(u:ResourceWindow,p:TenantAdmissionBudget["tenant"],c:TrustedAdmissionContext,reserve:number):boolean{return u.concurrentRequests>=p.concurrentRequests+reserve||u.requestsPerWindow>=p.requestsPerWindow+reserve||(c.operationClass==="expensive_mutation"&&u.expensiveMutationsPerWindow>=p.expensiveMutationsPerWindow+reserve)||(c.operationClass==="background"&&u.backgroundIntentsPerWindow>=p.backgroundIntentsPerWindow+reserve)||(c.dependencyKey!==null&&u.providerCallsPerWindow>=p.providerCallsPerWindow+reserve)||(c.operationClass!=="query"&&u.databaseWritesPerWindow>=p.databaseWritesPerWindow+reserve);}
  private increment(u:ResourceWindow,c:TrustedAdmissionContext):ResourceWindow{return{...u,concurrentRequests:boundedIncrement(u.concurrentRequests),requestsPerWindow:boundedIncrement(u.requestsPerWindow),expensiveMutationsPerWindow:c.operationClass==="expensive_mutation"?boundedIncrement(u.expensiveMutationsPerWindow):u.expensiveMutationsPerWindow,backgroundIntentsPerWindow:c.operationClass==="background"?boundedIncrement(u.backgroundIntentsPerWindow):u.backgroundIntentsPerWindow,providerCallsPerWindow:c.dependencyKey?boundedIncrement(u.providerCallsPerWindow):u.providerCallsPerWindow,databaseWritesPerWindow:c.operationClass==="query"?u.databaseWritesPerWindow:boundedIncrement(u.databaseWritesPerWindow)};}
}

export class LocalCircuitBreaker implements CircuitBreakerPort {
  private readonly states=new Map<string,CircuitBreakerState>(); private probeSequence=0;
  constructor(private readonly now:()=>number,private readonly policy:CircuitBreakerPolicy,private readonly observations:TrafficObservationPort|null=null){if(policy.failureThreshold<1||policy.cooldownMs<100||policy.halfOpenProbeLimit!==1)throw new TypeError("INVALID_CIRCUIT_POLICY");}
  async evaluate(context:TrustedAdmissionContext):Promise<CircuitBreakerDecision>{assertTrustedContext(context);if(!context.dependencyKey)return Object.freeze({admitted:true,probe:false,state:"closed",retryAfterSeconds:null,probeToken:null});const key=this.scopeKey(context),t=this.now(),current=this.states.get(key)??this.closed(key);if(current.state==="open"){if((current.cooldownUntil as number)>t)return Object.freeze({admitted:false,probe:false,state:"open",retryAfterSeconds:Math.max(1,Math.ceil(((current.cooldownUntil as number)-t)/1000)),probeToken:null});const token=`circuit-probe-${++this.probeSequence}`,next=Object.freeze({...current,state:"half_open" as const,halfOpenProbeCount:1,version:current.version+1,probeLeaseToken:token,probeLeaseExpiresAt:t+this.policy.cooldownMs});this.states.set(key,next);this.observeSafe("circuit.half_open",context,"CIRCUIT_COOLDOWN_ELAPSED","warning");return Object.freeze({admitted:true,probe:true,state:"half_open",retryAfterSeconds:null,probeToken:token});}if(current.state==="half_open"&&(current.probeLeaseExpiresAt??0)<=t){const token=`circuit-probe-${++this.probeSequence}`,next=Object.freeze({...current,version:current.version+1,probeLeaseToken:token,probeLeaseExpiresAt:t+this.policy.cooldownMs});this.states.set(key,next);return Object.freeze({admitted:true,probe:true,state:"half_open",retryAfterSeconds:null,probeToken:token});}return current.state==="half_open"?Object.freeze({admitted:false,probe:false,state:"half_open",retryAfterSeconds:1,probeToken:null}):Object.freeze({admitted:true,probe:false,state:"closed",retryAfterSeconds:null,probeToken:null});}
  recordFailure(context:TrustedAdmissionContext,probeToken:string|null=null):CircuitBreakerState{assertTrustedContext(context);if(!context.dependencyKey)throw new TypeError("DEPENDENCY_REQUIRED");const key=this.scopeKey(context),t=this.now(),current=this.states.get(key)??this.closed(key);if(current.state==="half_open"&&probeToken!==current.probeLeaseToken)throw new TrafficProtectionError("STALE_CIRCUIT_PROBE",false);const failures=boundedIncrement(current.consecutiveFailureCount),opened=current.state==="half_open"||failures>=this.policy.failureThreshold,next=Object.freeze({...current,state:opened?"open" as const:"closed" as const,consecutiveFailureCount:failures,halfOpenProbeCount:0,openedAt:opened?t:null,cooldownUntil:opened?t+this.policy.cooldownMs:null,version:current.version+1,probeLeaseToken:null,probeLeaseExpiresAt:null});this.states.set(key,next);if(opened&&current.state!=="open")this.observeSafe("circuit.opened",context,"CIRCUIT_FAILURE_THRESHOLD","error");return next;}
  recordSuccess(context:TrustedAdmissionContext,probeToken:string|null=null):CircuitBreakerState{assertTrustedContext(context);if(!context.dependencyKey)throw new TypeError("DEPENDENCY_REQUIRED");const prior=this.state(context);if(prior.state!=="half_open"||probeToken!==prior.probeLeaseToken||(prior.probeLeaseExpiresAt??0)<this.now())throw new TrafficProtectionError("STALE_CIRCUIT_PROBE",false);const next=this.closed(this.scopeKey(context),prior.version+1);this.states.set(next.scopeKey,next);this.observeSafe("circuit.closed",context,"CIRCUIT_PROBE_SUCCEEDED","info");return next;}
  state(context:TrustedAdmissionContext):CircuitBreakerState{return this.states.get(this.scopeKey(context))??this.closed(this.scopeKey(context));}
  private observeSafe(eventType:"circuit.opened"|"circuit.half_open"|"circuit.closed",context:TrustedAdmissionContext,reasonCode:string,severity:TrafficObservation["severity"]){void this.observations?.observe({eventType,tenantId:context.tenantId,operation:context.dependencyKey??"dependency",reasonCode,severity}).catch(()=>undefined);}
  private scopeKey(context:TrustedAdmissionContext){return `tenant:${context.tenantId}:provider:${context.dependencyKey}`;}
  private closed(scopeKey:string,version=1):CircuitBreakerState{return Object.freeze({scopeKey,state:"closed",consecutiveFailureCount:0,halfOpenProbeCount:0,openedAt:null,cooldownUntil:null,version,probeLeaseToken:null,probeLeaseExpiresAt:null});}
}

export class LocalLoadShedding implements LoadSheddingPort {
  private mode:DegradationMode="normal";private recoveryEligibleAt=0;private version=1;
  constructor(private readonly now:()=>number,private readonly policy:LoadSheddingPolicy,private readonly observations:TrafficObservationPort|null=null){if(policy.recoveryHysteresisMs<100||policy.recoveryHysteresisMs>604800000)throw new TypeError("INVALID_LOAD_SHEDDING_POLICY");}
  activate(mode:Exclude<DegradationMode,"normal">):number{this.transition(this.version,mode);return this.version;}
  transition(expectedVersion:number,mode:DegradationMode):boolean{if(expectedVersion!==this.version)return false;this.mode=mode;this.version=boundedIncrement(this.version);this.recoveryEligibleAt=mode==="normal"?0:this.now()+this.policy.recoveryHysteresisMs;this.observeSafe(mode==="normal"?"degradation.recovered":"degradation.activated",mode==="normal"?"DEGRADATION_RECOVERED":`DEGRADATION_${mode.toUpperCase()}`,mode==="emergency"?"critical":mode==="normal"?"info":"warning");return true;}
  recover(expectedVersion=this.version):boolean{if(this.now()<this.recoveryEligibleAt)return false;return this.transition(expectedVersion,"normal");}
  snapshot(){return Object.freeze({mode:this.mode,version:this.version,recoveryEligibleAt:this.recoveryEligibleAt});}
  currentMode(){return this.mode;}
  async evaluate(context:TrustedAdmissionContext):Promise<AdmissionSheddingDecision>{assertTrustedContext(context);return Object.freeze(this.decision(context));}
  private observeSafe(eventType:"degradation.activated"|"degradation.recovered",reasonCode:string,severity:TrafficObservation["severity"]){void this.observations?.observe({eventType,tenantId:null,operation:"platform.load_shedding",reasonCode,severity}).catch(()=>undefined);}
  private decision(c:TrustedAdmissionContext):AdmissionSheddingDecision{if(this.mode==="normal"||c.priority==="critical")return{admitted:true,deferred:false,reasonCode:"LOAD_OK"};if(this.mode==="protect_background"&&c.priority==="background")return{admitted:false,deferred:true,reasonCode:"BACKGROUND_DEFERRED"};if(this.mode==="protect_optional"&&(c.priority==="optional"||c.priority==="background"))return{admitted:false,deferred:c.priority==="background",reasonCode:"OPTIONAL_SHED"};if(this.mode==="protect_writes"&&c.operationClass!=="query")return{admitted:false,deferred:false,reasonCode:"WRITE_SHED"};if(this.mode==="emergency"&&!isEmergencySafe(c.routeKey))return{admitted:false,deferred:false,reasonCode:"EMERGENCY_SHED"};return{admitted:true,deferred:false,reasonCode:"LOAD_OK"};}
}

export class LocalWebhookDeduplicator implements WebhookDeduplicationPort {
  private readonly receipts=new Map<string,WebhookReceiptRecord>();
  constructor(private readonly now:()=>number,private readonly uuidv7:UuidV7,private readonly ttlMs=24*60*60*1000,private readonly leaseMs=30_000,private readonly maxAttempts=3){if(ttlMs<1000||leaseMs<100)throw new TypeError("INVALID_WEBHOOK_TTL");}
  async claim(fingerprint:WebhookEventFingerprint):Promise<WebhookReplayResult>{validateFingerprint(fingerprint);const key=webhookKey(fingerprint),t=this.now(),existing=this.receipts.get(key);if(existing&&existing.status!=="expired"){if(existing.payloadFingerprint!==fingerprint.payloadFingerprint)return this.result(existing,"fingerprint_conflict",false,null);if(existing.status==="completed")return this.result(existing,"duplicate_replay",false,null);if(existing.status==="failed_terminal")return this.result(existing,"terminal_failure",false,null);if(existing.status==="processing"&&(existing.leaseExpiresAt??0)>t)return this.result(existing,"processing_deferred",false,1);if(existing.attemptCount>=this.maxAttempts){const terminal=Object.freeze({...existing,status:"failed_terminal" as const,leaseExpiresAt:null,safeFailureCode:"WEBHOOK_MAX_ATTEMPTS",lastReceivedAt:t,replayCount:boundedIncrement(existing.replayCount)});this.receipts.set(key,terminal);return this.result(terminal,"terminal_failure",false,null);}const token=this.uuidv7.generate(),taken=Object.freeze({...existing,status:"processing" as const,leaseOwnerToken:token,leaseExpiresAt:t+this.leaseMs,attemptCount:boundedIncrement(existing.attemptCount),lastAttemptAt:t,safeFailureCode:null,lastReceivedAt:t,replayCount:boundedIncrement(existing.replayCount)});this.receipts.set(key,taken);return this.result(taken,"lease_takeover",true,null,token);}
    const token=this.uuidv7.generate(),receipt=Object.freeze({...fingerprint,receiptId:this.uuidv7.generate(),status:"processing" as const,safeResult:null,leaseOwnerToken:token,leaseExpiresAt:t+this.leaseMs,attemptCount:1,lastAttemptAt:t,safeFailureCode:null,completedAt:null,replayCount:0,firstReceivedAt:t,lastReceivedAt:t,expiresAt:t+this.ttlMs});this.receipts.set(key,receipt);return this.result(receipt,"first_seen",true,null,token);}
  async complete(receiptId:string,leaseToken:string,safeResult:Readonly<Record<string,string|number|boolean|null>>):Promise<void>{const json=JSON.stringify(safeResult);if(json.length>2048||/token|authorization|request.?body|raw.?uid/i.test(json))throw new TypeError("UNSAFE_WEBHOOK_RESULT");const pair=[...this.receipts.entries()].find(([,r])=>r.receiptId===receiptId);if(!pair)throw new TrafficProtectionError("DUPLICATE_EVENT",false);const[key,r]=pair;if(r.status==="completed"&&r.leaseOwnerToken===leaseToken)return;if(r.status!=="processing"||r.leaseOwnerToken!==leaseToken||(r.leaseExpiresAt??0)<=this.now())throw new TrafficProtectionError("STALE_WEBHOOK_LEASE",false);this.receipts.set(key,Object.freeze({...r,status:"completed" as const,safeResult:Object.freeze({...safeResult}),leaseExpiresAt:null,completedAt:this.now()}));}
  async fail(receiptId:string,leaseToken:string,safeFailureCode:string):Promise<void>{const pair=[...this.receipts.entries()].find(([,r])=>r.receiptId===receiptId);if(!pair)throw new TrafficProtectionError("DUPLICATE_EVENT",false);const[key,r]=pair;if(r.status!=="processing"||r.leaseOwnerToken!==leaseToken)throw new TrafficProtectionError("STALE_WEBHOOK_LEASE",false);const terminal=r.attemptCount>=this.maxAttempts;this.receipts.set(key,Object.freeze({...r,status:terminal?"failed_terminal" as const:"failed_retryable" as const,safeFailureCode,leaseExpiresAt:terminal?null:this.now()+this.leaseMs}));}
  get records(){return Object.freeze([...this.receipts.values()]);}
  private result(r:WebhookReceiptRecord,status:WebhookReplayResult["status"],executeMutation:boolean,retryAfterSeconds:number|null,leaseToken:string|null=null):WebhookReplayResult{return Object.freeze({status,receiptId:r.receiptId,safeResult:r.safeResult,executeMutation,leaseToken,attemptCount:r.attemptCount,retryAfterSeconds});}
}

export class LocalAcceptedOperationStore {
  private readonly receipts = new Map<string, AcceptedOperationReceipt>();

  constructor(private readonly uuidv7: UuidV7) {}

  accept(
    idempotencyKey: string,
    supportCode: string,
    retryAfterSeconds: number,
  ): AcceptedOperationReceipt {
    const existing = this.receipts.get(idempotencyKey);
    if (existing) return existing;
    const receipt = Object.freeze({
      receiptId: this.uuidv7.generate(),
      status: "accepted" as const,
      supportCode,
      retry: Object.freeze({
        retryable: true,
        retryAfterSeconds: Math.max(1, Math.min(3600, retryAfterSeconds)),
      }),
    });
    this.receipts.set(idempotencyKey, receipt);
    return receipt;
  }
}

export class LocalTrafficObservationAdapter implements TrafficObservationPort {
  private readonly events: TrafficObservation[] = [];
  get captured(): readonly TrafficObservation[] { return this.events; }
  async observe(event: TrafficObservation): Promise<void> {
    if (this.events.length >= 1000) this.events.shift();
    this.events.push(Object.freeze({ ...event }));
  }
}

export class DisabledTrafficObservationAdapter implements TrafficObservationPort {
  async observe(_event: TrafficObservation): Promise<void> {
    return Promise.resolve();
  }
}
export class LocalTrafficReadinessAdapter implements TrafficReadinessPort {
  constructor(private readonly loadShedding: LocalLoadShedding) {}
  async snapshot() {
    const mode = this.loadShedding.currentMode();
    return Object.freeze({
      emergency: mode === "emergency",
      reasonCode: mode === "emergency" ? "EMERGENCY_DEGRADATION_ACTIVE" : null,
    });
  }
}

export function isEmergencySafe(routeKey: string): boolean {
  return routeKey === "/health" || routeKey === "/ready" || routeKey === "/status"
    || routeKey === "/security/recovery";
}

function validateFingerprint(fingerprint: WebhookEventFingerprint): void {
  const values = [
    fingerprint.tenantId,
    fingerprint.applicationScopeKey,
    fingerprint.providerKey,
    fingerprint.providerEventId,
    fingerprint.normalizedEventType,
  ];
  if (values.some((value) => !value.trim() || value.length > 200)) {
    throw new TypeError("INVALID_WEBHOOK_FINGERPRINT");
  }
  if (
    !/^digest:[0-9a-f]{64}$/.test(fingerprint.issuerContextDigest)
    || !/^[0-9a-f]{64}$/.test(fingerprint.payloadFingerprint)
  ) {
    throw new TypeError("INVALID_WEBHOOK_FINGERPRINT");
  }
}

function webhookKey(fingerprint: WebhookEventFingerprint): string {
  return [
    fingerprint.tenantId,
    fingerprint.applicationScopeKey,
    fingerprint.providerKey,
    fingerprint.issuerContextDigest,
    fingerprint.providerEventId,
  ].join("|");
}
