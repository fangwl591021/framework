import { describe, expect, it } from "vitest";
import type { TrustedAdmissionContext } from "../src/platform-traffic";
import {
  LocalCircuitBreaker,
  LocalLoadShedding,
  LocalSlidingWindowRateLimiter,
  LocalTenantResourceIsolation,
  TrafficAdmissionGuard,
  StaticModuleGate,
  StaticPermissionGate,
  LocalWebhookDeduplicator,
  LocalTrafficObservationAdapter,
  boundedIncrement,
} from "../src/platform-traffic";
import type { UuidV7 } from "../src/core/uuidv7";

class Uuid implements UuidV7 { private n=0; generate(){this.n+=1;return "019d0000-0000-7000-8000-"+String(this.n).padStart(12,"0");} }
const digest="digest:"+"a".repeat(64);
const context=(overrides:Partial<TrustedAdmissionContext>={}):TrustedAdmissionContext=>({source:"trusted_runtime_context",environment:"development",tenantId:"019d0000-0000-7000-8000-000000000001",applicationId:null,moduleKey:"core",routeKey:"/internal/mutate",priority:"normal",operationClass:"mutation",actorDigest:digest,ipDigest:digest,dependencyKey:null,permissionGranted:true,moduleEnabled:true,...overrides});
const policy={windowMs:1000,concurrentRequests:3,requestsPerWindow:100,expensiveMutationsPerWindow:100,backgroundIntentsPerWindow:100,providerCallsPerWindow:100,databaseWritesPerWindow:100};

describe("atomic local admission contracts",()=>{
  it("admits exactly configured rate winners under Promise concurrency",async()=>{let now=1;const limiter=new LocalSlidingWindowRateLimiter(()=>now,{policyKey:"p",limit:5,burst:2,windowMs:1000,cooldownMs:0,enforcementMode:"enforce",priority:"normal"});const results=await Promise.all(Array.from({length:30},()=>limiter.evaluate(context())));expect(results.filter(x=>x.admitted)).toHaveLength(7);});
  it("does not consume a Tenant counter when platform admission loses",async()=>{let now=1;const hierarchical=new (await import("../src/platform-traffic")).LocalHierarchicalRateLimiter(()=>now,{policyKey:"tenant",limit:1,burst:0,windowMs:1000,cooldownMs:0,enforcementMode:"enforce",priority:"normal"},{policyKey:"platform",limit:1,burst:0,windowMs:100,cooldownMs:0,enforcementMode:"enforce",priority:"normal"});await hierarchical.evaluate(context());const tenantB=context({tenantId:"019d0000-0000-7000-8000-000000000002"});expect((await hierarchical.evaluate(tenantB)).reasonCode).toBe("PLATFORM_RATE_LIMITED");now=102;expect((await hierarchical.evaluate(tenantB)).admitted).toBe(true);});
  it("admits exact tenant concurrency winners",async()=>{let now=1;const isolation=new LocalTenantResourceIsolation(()=>now,{tenant:policy,platform:{...policy,concurrentRequests:20}},1000);const results=await Promise.all(Array.from({length:20},()=>isolation.evaluate(context())));expect(results.filter(x=>x.admitted)).toHaveLength(3);});
  it("release is idempotent and never underflows",async()=>{const isolation=new LocalTenantResourceIsolation(()=>1,{tenant:policy,platform:policy});const result=await isolation.evaluate(context());await isolation.release(result.leaseToken as string);await isolation.release(result.leaseToken as string);expect(isolation.snapshot(context().tenantId).concurrentRequests).toBe(0);});
  it("abandoned concurrency lease expires safely",async()=>{let now=1;const isolation=new LocalTenantResourceIsolation(()=>now,{tenant:{...policy,concurrentRequests:1},platform:policy},100);expect((await isolation.evaluate(context())).admitted).toBe(true);expect((await isolation.evaluate(context())).admitted).toBe(false);now=102;expect((await isolation.evaluate(context())).admitted).toBe(true);});
  it("counter overflow fails closed",()=>expect(()=>boundedIncrement(1_000_000_000)).toThrow("DEPENDENCY_UNAVAILABLE"));
});

describe("atomic circuit and degradation transitions",()=>{
  it("simultaneous threshold crossing opens once",async()=>{const observations=new LocalTrafficObservationAdapter();const circuit=new LocalCircuitBreaker(()=>1,{failureThreshold:2,cooldownMs:100,halfOpenProbeLimit:1},observations);const c=context({dependencyKey:"provider"});await Promise.all([Promise.resolve().then(()=>circuit.recordFailure(c)),Promise.resolve().then(()=>circuit.recordFailure(c))]);expect(circuit.state(c).state).toBe("open");expect(observations.captured.filter(x=>x.eventType==="circuit.opened")).toHaveLength(1);});
  it("half-open has one winner and stale probe cannot close",async()=>{let now=1;const circuit=new LocalCircuitBreaker(()=>now,{failureThreshold:1,cooldownMs:100,halfOpenProbeLimit:1});const c=context({dependencyKey:"provider"});circuit.recordFailure(c);now=102;const [a,b]=await Promise.all([circuit.evaluate(c),circuit.evaluate(c)]);expect([a,b].filter(x=>x.admitted)).toHaveLength(1);expect(()=>circuit.recordSuccess(c,"stale-probe")).toThrow("STALE_CIRCUIT_PROBE");const winner=[a,b].find(x=>x.admitted);expect(circuit.recordSuccess(c,winner?.probeToken??null).state).toBe("closed");});
  it("replaces an abandoned probe lease and fences the old probe",async()=>{let now=1;const circuit=new LocalCircuitBreaker(()=>now,{failureThreshold:1,cooldownMs:100,halfOpenProbeLimit:1});const c=context({dependencyKey:"provider"});circuit.recordFailure(c);now=102;const oldProbe=await circuit.evaluate(c);now=203;const nextProbe=await circuit.evaluate(c);expect(nextProbe).toMatchObject({admitted:true,probe:true});expect(nextProbe.probeToken).not.toBe(oldProbe.probeToken);expect(()=>circuit.recordSuccess(c,oldProbe.probeToken)).toThrow("STALE_CIRCUIT_PROBE");});
  it("degradation compare-and-swap chooses one transition",async()=>{const shedding=new LocalLoadShedding(()=>1,{recoveryHysteresisMs:100});const version=shedding.snapshot().version;const winners=await Promise.all([Promise.resolve(shedding.transition(version,"protect_writes")),Promise.resolve(shedding.transition(version,"emergency"))]);expect(winners.filter(Boolean)).toHaveLength(1);expect(shedding.snapshot().version).toBe(version+1);});
});

describe("route-specific protection failure policy",()=>{
  const failing={evaluate:async()=>{throw new Error("storage unavailable");}};
  const guard=new TrafficAdmissionGuard(new LocalWebhookDeduplicator(()=>1,new Uuid()),failing,{...failing,release:async()=>undefined},failing,failing,new StaticModuleGate(),new StaticPermissionGate(),new LocalTrafficObservationAdapter());
  it("fails closed for unsafe mutations",async()=>expect(await guard.admit({context:context(),correlationId:"mutation"})).toMatchObject({status:"throttled"}));
  it("allows only trusted health bypass",async()=>expect(await guard.admit({context:context({routeKey:"/health",operationClass:"query"}),correlationId:"health"})).toMatchObject({status:"admitted"}));
  it("does not grant arbitrary security bypass",async()=>expect(await guard.admit({context:context({routeKey:"/security/arbitrary",operationClass:"query"}),correlationId:"security"})).toMatchObject({status:"throttled"}));
});
