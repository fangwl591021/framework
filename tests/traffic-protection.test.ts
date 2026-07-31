import { describe, expect, it } from "vitest";
import type { UuidV7 } from "../src/core/uuidv7";
import {
  DisabledTrafficObservationAdapter, LocalAcceptedOperationStore, LocalCircuitBreaker,
  LocalHierarchicalRateLimiter, LocalLoadShedding, LocalSlidingWindowRateLimiter, LocalTenantResourceIsolation,
  LocalTrafficObservationAdapter, LocalTrafficReadinessAdapter, LocalWebhookDeduplicator,
  StaticModuleGate, StaticPermissionGate, TrafficAdmissionGuard, isEmergencySafe,
  type DegradationMode, type TrustedAdmissionContext, type WebhookEventFingerprint,
} from "../src/platform-traffic";

class TestUuid implements UuidV7 { private n=0; generate(){ this.n+=1; return `019d0000-0000-7000-8000-${String(this.n).padStart(12,"0")}`; } }
let timestamp=1_800_000_000_000;
const digest=(c:string)=>`digest:${c.repeat(64)}`;
const fp=(x:Partial<WebhookEventFingerprint>={}):WebhookEventFingerprint=>({tenantId:"019d0000-0000-7000-8000-000000000001",applicationScopeKey:"app:one",providerKey:"provider",providerEventId:"event-1",issuerContextDigest:digest("a"),normalizedEventType:"event.created",payloadFingerprint:"b".repeat(64),...x});
const ctx=(x:Partial<TrustedAdmissionContext>={}):TrustedAdmissionContext=>({source:"trusted_runtime_context",environment:"development",tenantId:"019d0000-0000-7000-8000-000000000001",applicationId:"019d0000-0000-7000-8000-000000000010",moduleKey:"event-engine",routeKey:"/internal/events",priority:"normal",operationClass:"mutation",actorDigest:digest("c"),ipDigest:digest("d"),dependencyKey:null,permissionGranted:true,moduleEnabled:true,...x});
const rate={policyKey:"default",limit:2,burst:1,windowMs:1000,cooldownMs:1000,enforcementMode:"enforce" as const,priority:"normal" as const};
const resource={windowMs:1000,concurrentRequests:10,requestsPerWindow:10,expensiveMutationsPerWindow:2,backgroundIntentsPerWindow:2,providerCallsPerWindow:2,databaseWritesPerWindow:5};

function guard(overrides:Record<string,unknown>={}){
 const dedup=new LocalWebhookDeduplicator(()=>timestamp,new TestUuid());
 const limiter=new LocalSlidingWindowRateLimiter(()=>timestamp,rate);
 const resources=new LocalTenantResourceIsolation(()=>timestamp,{tenant:resource,platform:resource});
 const circuit=new LocalCircuitBreaker(()=>timestamp,{failureThreshold:2,cooldownMs:1000,halfOpenProbeLimit:1});
 const shedding=new LocalLoadShedding(()=>timestamp,{recoveryHysteresisMs:1000});
 return new TrafficAdmissionGuard((overrides.dedup as typeof dedup)??dedup,(overrides.limiter as typeof limiter)??limiter,(overrides.resources as typeof resources)??resources,(overrides.circuit as typeof circuit)??circuit,(overrides.shedding as typeof shedding)??shedding,new StaticModuleGate(),new StaticPermissionGate(),(overrides.observations as LocalTrafficObservationAdapter)??new LocalTrafficObservationAdapter());
}

describe("webhook duplicate safety",()=>{
 it("executes first trusted event once",async()=>expect(await new LocalWebhookDeduplicator(()=>timestamp,new TestUuid()).claim(fp())).toMatchObject({status:"first_seen",executeMutation:true}));
 it("replays the same event",async()=>{const s=new LocalWebhookDeduplicator(()=>timestamp,new TestUuid());const a=await s.claim(fp());await s.complete(a.receiptId,a.leaseToken as string,{status:"completed"});expect(await s.claim(fp())).toMatchObject({status:"duplicate_replay",executeMutation:false,safeResult:{status:"completed"}})});
 it("conflicts on payload mismatch",async()=>{const s=new LocalWebhookDeduplicator(()=>timestamp,new TestUuid());await s.claim(fp());expect(await s.claim(fp({payloadFingerprint:"e".repeat(64)}))).toMatchObject({status:"fingerprint_conflict",executeMutation:false})});
 it("separates issuer contexts",async()=>{const s=new LocalWebhookDeduplicator(()=>timestamp,new TestUuid());const a=await s.claim(fp());const b=await s.claim(fp({issuerContextDigest:digest("f")}));expect(b.receiptId).not.toBe(a.receiptId)});
 it("takes over an expired deterministic local lease",async()=>{const s=new LocalWebhookDeduplicator(()=>timestamp,new TestUuid(),1000,1000);const a=await s.claim(fp());timestamp+=1001;const b=await s.claim(fp());expect(b).toMatchObject({receiptId:a.receiptId,status:"lease_takeover",executeMutation:true,attemptCount:2})});
 it("rejects unsafe result",async()=>{const s=new LocalWebhookDeduplicator(()=>timestamp,new TestUuid());const a=await s.claim(fp());await expect(s.complete(a.receiptId,a.leaseToken as string,{token:"unsafe"})).rejects.toThrow("UNSAFE_WEBHOOK_RESULT")});
 it("completes idempotently",async()=>{const s=new LocalWebhookDeduplicator(()=>timestamp,new TestUuid());const a=await s.claim(fp());await s.complete(a.receiptId,a.leaseToken as string,{code:"OK"});await s.complete(a.receiptId,a.leaseToken as string,{code:"OK"});expect(s.records).toHaveLength(1)});
});

describe("rate and tenant isolation",()=>{
 it("admits configured capacity and burst",async()=>{const s=new LocalSlidingWindowRateLimiter(()=>timestamp,rate);await s.evaluate(ctx());await s.evaluate(ctx());expect((await s.evaluate(ctx())).admitted).toBe(true)});
 it("throttles after burst",async()=>{const s=new LocalSlidingWindowRateLimiter(()=>timestamp,rate);await s.evaluate(ctx());await s.evaluate(ctx());await s.evaluate(ctx());expect(await s.evaluate(ctx())).toMatchObject({admitted:false,retryAfterSeconds:2})});
 it("enforces a platform rate window across tenants",async()=>{const s=new LocalHierarchicalRateLimiter(()=>timestamp,{...rate,limit:5,burst:0},{...rate,limit:1,burst:0});expect((await s.evaluate(ctx())).admitted).toBe(true);expect(await s.evaluate(ctx({tenantId:"019d0000-0000-7000-8000-000000000002"}))).toMatchObject({admitted:false,reasonCode:"PLATFORM_RATE_LIMITED"})});
 it("keeps tenant throttling distinct from platform throttling",async()=>{const s=new LocalHierarchicalRateLimiter(()=>timestamp,{...rate,limit:1,burst:0},{...rate,limit:10,burst:0});await s.evaluate(ctx());expect(await s.evaluate(ctx())).toMatchObject({admitted:false,reasonCode:"TENANT_RATE_LIMITED"})}); it("isolates tenant counters",async()=>{const s=new LocalSlidingWindowRateLimiter(()=>timestamp,{...rate,limit:1,burst:0});await s.evaluate(ctx());expect((await s.evaluate(ctx({tenantId:"019d0000-0000-7000-8000-000000000002"}))).admitted).toBe(true)});
 it("supports observe mode",async()=>{const s=new LocalSlidingWindowRateLimiter(()=>timestamp,{...rate,limit:1,burst:0,enforcementMode:"observe"});await s.evaluate(ctx());expect(await s.evaluate(ctx())).toMatchObject({admitted:true,observedOnly:true})});
 it("rejects raw actor evidence",async()=>{const s=new LocalSlidingWindowRateLimiter(()=>timestamp,rate);await expect(s.evaluate(ctx({actorDigest:"raw-user"}))).rejects.toThrow("trusted digest")});
 it("throttles only exhausted tenant",async()=>{const s=new LocalTenantResourceIsolation(()=>timestamp,{tenant:{...resource,requestsPerWindow:1},platform:resource});await s.evaluate(ctx());expect((await s.evaluate(ctx())).reasonCode).toBe("TENANT_BUDGET_EXHAUSTED");expect((await s.evaluate(ctx({tenantId:"019d0000-0000-7000-8000-000000000002"}))).admitted).toBe(true)});
 it("preserves critical traffic under platform pressure",async()=>{const s=new LocalTenantResourceIsolation(()=>timestamp,{tenant:resource,platform:{...resource,requestsPerWindow:1}});await s.evaluate(ctx());expect((await s.evaluate(ctx())).reasonCode).toBe("PLATFORM_BUDGET_EXHAUSTED");expect((await s.evaluate(ctx({priority:"critical"}))).admitted).toBe(true)});
 it("releases concurrency",async()=>{const s=new LocalTenantResourceIsolation(()=>timestamp,{tenant:resource,platform:resource});const admitted=await s.evaluate(ctx());await s.release(admitted.leaseToken as string);expect(s.snapshot(ctx().tenantId).concurrentRequests).toBe(0)});
});

describe("circuit isolation",()=>{
 it("opens at threshold",()=>{const s=new LocalCircuitBreaker(()=>timestamp,{failureThreshold:2,cooldownMs:1000,halfOpenProbeLimit:1});s.recordFailure(ctx({dependencyKey:"p"}));expect(s.recordFailure(ctx({dependencyKey:"p"})).state).toBe("open")});
 it("fails fast while open",async()=>{const s=new LocalCircuitBreaker(()=>timestamp,{failureThreshold:1,cooldownMs:1000,halfOpenProbeLimit:1});s.recordFailure(ctx({dependencyKey:"p"}));expect(await s.evaluate(ctx({dependencyKey:"p"}))).toMatchObject({admitted:false,state:"open"})});
 it("admits bounded half-open probe",async()=>{const s=new LocalCircuitBreaker(()=>timestamp,{failureThreshold:1,cooldownMs:1000,halfOpenProbeLimit:1});s.recordFailure(ctx({dependencyKey:"p"}));timestamp+=1001;expect(await s.evaluate(ctx({dependencyKey:"p"}))).toMatchObject({admitted:true,probe:true,state:"half_open"});expect((await s.evaluate(ctx({dependencyKey:"p"}))).admitted).toBe(false)});
 it("closes only with the winning probe",async()=>{const s=new LocalCircuitBreaker(()=>timestamp,{failureThreshold:1,cooldownMs:1000,halfOpenProbeLimit:1});s.recordFailure(ctx({dependencyKey:"p"}));timestamp+=1001;const probe=await s.evaluate(ctx({dependencyKey:"p"}));expect(s.recordSuccess(ctx({dependencyKey:"p"}),probe.probeToken).state).toBe("closed")});
 it("emits scoped open, half-open, and closed observations",async()=>{const o=new LocalTrafficObservationAdapter();const s=new LocalCircuitBreaker(()=>timestamp,{failureThreshold:1,cooldownMs:1000,halfOpenProbeLimit:1},o);s.recordFailure(ctx({dependencyKey:"provider-observed"}));timestamp+=1001;const probe=await s.evaluate(ctx({dependencyKey:"provider-observed"}));s.recordSuccess(ctx({dependencyKey:"provider-observed"}),probe.probeToken);expect(o.captured.map(e=>e.eventType)).toEqual(["circuit.opened","circuit.half_open","circuit.closed"])});
 it("isolates circuit observation failure",()=>{const s=new LocalCircuitBreaker(()=>timestamp,{failureThreshold:1,cooldownMs:1000,halfOpenProbeLimit:1},{observe:async()=>{throw new Error("sidecar")}});expect(()=>s.recordFailure(ctx({dependencyKey:"provider-failing-observer"}))).not.toThrow()}); it("does not globalize tenant provider outage",async()=>{const s=new LocalCircuitBreaker(()=>timestamp,{failureThreshold:1,cooldownMs:1000,halfOpenProbeLimit:1});s.recordFailure(ctx({dependencyKey:"p"}));expect((await s.evaluate(ctx({tenantId:"019d0000-0000-7000-8000-000000000002",dependencyKey:"p"}))).admitted).toBe(true)});
});

describe("load shedding and backpressure",()=>{
 it.each([
  ["protect_background","background","background",false,true],
  ["protect_optional","optional","query",false,false],
  ["protect_writes","normal","mutation",false,false],
  ["emergency","normal","query",false,false],
 ] as const)("applies %s",async(mode,priority,operationClass,admitted,deferred)=>{const s=new LocalLoadShedding(()=>timestamp,{recoveryHysteresisMs:1000});s.activate(mode as Exclude<DegradationMode,"normal">);expect(await s.evaluate(ctx({priority,operationClass}))).toMatchObject({admitted,deferred})});
 it.each(["/health","/ready","/status","/security/recovery"])("preserves %s",route=>expect(isEmergencySafe(route)).toBe(true));
 it("emits degradation activation and recovery observations",()=>{const o=new LocalTrafficObservationAdapter();const s=new LocalLoadShedding(()=>timestamp,{recoveryHysteresisMs:1000},o);s.activate("emergency");timestamp+=1001;s.recover();expect(o.captured.map(e=>e.eventType)).toEqual(["degradation.activated","degradation.recovered"])}); it("uses hysteresis",()=>{const s=new LocalLoadShedding(()=>timestamp,{recoveryHysteresisMs:1000});s.activate("emergency");expect(s.recover()).toBe(false);timestamp+=1001;expect(s.recover()).toBe(true)});
 it("stores one accepted intent per idempotency key",()=>{const s=new LocalAcceptedOperationStore(new TestUuid());const a=s.accept("key","SUP-0000000001",5);expect(s.accept("key","SUP-0000000001",5)).toBe(a)});
 it("exposes emergency to readiness",async()=>{const s=new LocalLoadShedding(()=>timestamp,{recoveryHysteresisMs:1000});const r=new LocalTrafficReadinessAdapter(s);expect((await r.snapshot()).emergency).toBe(false);s.activate("emergency");expect((await r.snapshot()).emergency).toBe(true)});
});

describe("unified admission",()=>{
 it("admits when every guard passes",async()=>expect(await guard().admit({context:ctx(),correlationId:"c1"})).toMatchObject({status:"admitted",code:null}));
 it("rejects unverified webhook",async()=>expect(await guard().admit({context:ctx(),correlationId:"c2",webhook:{signature:{source:"trusted_signature_verifier",verified:false},fingerprint:fp()}})).toMatchObject({status:"rejected",retryable:false}));
 it("fails closed on limiter failure",async()=>expect(await guard({limiter:{evaluate:async()=>{throw new Error("down")}}}).admit({context:ctx(),correlationId:"c3"})).toMatchObject({status:"throttled",retryable:true}));
 it("observability failure does not change admission",async()=>expect((await guard({observations:{observe:async()=>{throw new Error("sidecar")}}}).admit({context:ctx(),correlationId:"c4"})).status).toBe("admitted"));
 it("module gate is enforced",async()=>expect((await guard().admit({context:ctx({moduleEnabled:false}),correlationId:"c5"})).status).toBe("rejected"));
 it("permission gate is enforced",async()=>expect((await guard().admit({context:ctx({permissionGranted:false}),correlationId:"c6"})).status).toBe("rejected"));
 it("reports an in-flight duplicate as deferred, not completed",async()=>{const g=guard();const request={context:ctx(),correlationId:"in-flight",webhook:{signature:{source:"trusted_signature_verifier" as const,verified:true},fingerprint:fp()}};expect((await g.admit(request)).status).toBe("admitted");expect(await g.admit(request)).toMatchObject({status:"shed",code:"REQUEST_DEFERRED",statusCategory:"accepted"})}); it("rejects a cross-Tenant webhook fingerprint",async()=>expect(await guard().admit({context:ctx(),correlationId:"c7",webhook:{signature:{source:"trusted_signature_verifier",verified:true},fingerprint:fp({tenantId:"019d0000-0000-7000-8000-000000000002"})}})).toMatchObject({status:"rejected",code:"PERMISSION_DENIED"})); it("disabled observation provider is a no-op",async()=>await expect(new DisabledTrafficObservationAdapter().observe({eventType:"traffic.rate_limited",tenantId:null,operation:"test",reasonCode:"TEST",severity:"info"})).resolves.toBeUndefined());
});