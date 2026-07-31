import type { AiRoute, AiUsageSummary, PreparedAiRequest } from "./models";

interface RequestRow { id:string; status:PreparedAiRequest["status"]; input_digest:string; stored_result_json:string|null; }
interface RouteRow { id:string; version:number; route_chain_json:string; max_latency_ms:number; cache_allowed:number; }

export class AiGatewayRepository {
  constructor(private readonly db: D1Database) {}

  async getTask(taskKey:string, taskVersion:number) {
    return this.db.prepare(`SELECT task_key, task_version, status, max_input_units, max_output_units, cache_policy FROM ai_task_registry WHERE task_key=?1 AND task_version=?2`).bind(taskKey,taskVersion).first<{task_key:string;task_version:number;status:string;max_input_units:number;max_output_units:number;cache_policy:string}>();
  }
  async getRequest(tenantId:string, applicationId:string, taskKey:string, idempotencyDigest:string):Promise<PreparedAiRequest|null> {
    const row=await this.db.prepare(`SELECT id,status,input_digest,stored_result_json FROM ai_request_records WHERE tenant_id=?1 AND application_id=?2 AND task_key=?3 AND idempotency_key_digest=?4`).bind(tenantId,applicationId,taskKey,idempotencyDigest).first<RequestRow>();
    return row?{requestId:row.id,status:row.status,replayed:true,storedResult:row.stored_result_json?JSON.parse(row.stored_result_json):null,inputDigest:row.input_digest}:null;
  }
  insertRequest(values:{id:string;tenantId:string;applicationId:string;actorMembershipId:string;taskKey:string;inputDigest:string;idempotencyDigest:string;locale:string;qualityTier:string;cacheDirective:string;inputUnits:number;outputUnits:number;costMicros:number;now:number}) {
    return this.db.prepare(`INSERT INTO ai_request_records(id,tenant_id,application_id,actor_membership_id,task_key,task_version,input_digest,idempotency_key_digest,locale,quality_tier,cache_directive,requested_input_units,requested_output_units,requested_cost_micros,status,generation,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,1,?6,?7,?8,?9,?10,?11,?12,?13,'prepared',1,?14,?14)`).bind(values.id,values.tenantId,values.applicationId,values.actorMembershipId,values.taskKey,values.inputDigest,values.idempotencyDigest,values.locale,values.qualityTier,values.cacheDirective,values.inputUnits,values.outputUnits,values.costMicros,values.now).run();
  }
  async getRoute(tenantId:string,applicationId:string,taskKey:string,qualityTier:string):Promise<{policyId:string;policyVersion:number;routes:AiRoute[];maxLatencyMs:number;cacheAllowed:boolean}|null>{
    const row=await this.db.prepare(`SELECT id,version,route_chain_json,max_latency_ms,cache_allowed FROM ai_route_policies WHERE task_key=?1 AND task_version=1 AND quality_tier=?2 AND status='active' AND ((scope_type='application' AND tenant_id=?3 AND application_id=?4) OR (scope_type='tenant' AND tenant_id=?3 AND application_id IS NULL) OR scope_type='platform') ORDER BY CASE scope_type WHEN 'application' THEN 1 WHEN 'tenant' THEN 2 ELSE 3 END LIMIT 1`).bind(taskKey,qualityTier,tenantId,applicationId).first<RouteRow>();
    return row?{policyId:row.id,policyVersion:row.version,routes:JSON.parse(row.route_chain_json),maxLatencyMs:row.max_latency_ms,cacheAllowed:row.cache_allowed===1}:null;
  }
  async claimBudget(values:{leaseIds:readonly string[];requestId:string;tenantId:string;applicationId:string;inputUnits:number;outputUnits:number;costMicros:number;now:number;expiresAt:number}):Promise<void>{
    const budgets=(await this.db.prepare(`SELECT id,version FROM ai_budgets WHERE status='active' AND window_started_at<=?1 AND window_ends_at>?1 AND (scope_type='platform' OR (tenant_id=?2 AND (application_id=?3 OR (application_id IS NULL AND scope_type='tenant')))) ORDER BY CASE scope_type WHEN 'platform' THEN 1 WHEN 'tenant' THEN 2 ELSE 3 END`).bind(values.now,values.tenantId,values.applicationId).all<{id:string;version:number}>()).results;
    if(!budgets.length||values.leaseIds.length<budgets.length)throw new Error("AI_BUDGET_EXCEEDED");
    const statements:D1PreparedStatement[]=[];
    budgets.forEach((budget,index)=>{
      const next=budget.version+1;
      statements.push(
        this.db.prepare(`UPDATE ai_budgets SET used_requests=used_requests+1,used_input_units=used_input_units+?1,used_output_units=used_output_units+?2,used_cost_micros=used_cost_micros+?3,concurrent_claims=concurrent_claims+1,version=version+1,updated_at=?4 WHERE id=?5 AND version=?6 AND status='active' AND used_requests<max_requests AND used_input_units+?1<=max_input_units AND used_output_units+?2<=max_output_units AND used_cost_micros+?3<=max_cost_micros AND concurrent_claims<max_concurrent`).bind(values.inputUnits,values.outputUnits,values.costMicros,values.now,budget.id,budget.version),
        this.db.prepare(`INSERT INTO ai_budget_leases(id,tenant_id,application_id,budget_id,request_id,fencing_token,reserved_input_units,reserved_output_units,reserved_cost_micros,status,expires_at,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,'active',?10,?11,?11)`).bind(values.leaseIds[index],values.tenantId,values.applicationId,budget.id,values.requestId,next,values.inputUnits,values.outputUnits,values.costMicros,values.expiresAt,values.now),
      );
    });
    statements.push(this.db.prepare(`UPDATE ai_request_records SET status='processing',generation=generation+1,updated_at=?1 WHERE tenant_id=?2 AND id=?3 AND status='prepared'`).bind(values.now,values.tenantId,values.requestId));
    await this.db.batch(statements);
  }  async complete(values:{usageId:string;requestId:string;tenantId:string;applicationId:string;actorMembershipId:string;taskKey:string;route:AiRoute;routePolicyId:string;routePolicyVersion:number;inputUnits:number;outputUnits:number;costMicros:number;cacheOutcome:string;latencyMs:number;result:Readonly<Record<string,unknown>>;now:number}):Promise<void>{
    const leases=(await this.db.prepare(`SELECT id,budget_id,fencing_token FROM ai_budget_leases WHERE tenant_id=?1 AND request_id=?2 AND status='active' ORDER BY budget_id`).bind(values.tenantId,values.requestId).all<{id:string;budget_id:string;fencing_token:number}>()).results;
    if(!leases.length)throw new Error("AI_BUDGET_LEASE_MISSING");
    const statements:D1PreparedStatement[]=[
      this.db.prepare(`INSERT INTO ai_usage_records(id,tenant_id,application_id,actor_membership_id,request_id,task_key,task_version,provider_key,model_key,model_version,route_policy_id,route_policy_version,input_units,output_units,estimated_cost_micros,cache_outcome,outcome,latency_ms,occurred_at) VALUES(?1,?2,?3,?4,?5,?6,1,?7,?8,?9,?10,?11,?12,?13,?14,?15,'completed',?16,?17)`).bind(values.usageId,values.tenantId,values.applicationId,values.actorMembershipId,values.requestId,values.taskKey,values.route.providerKey,values.route.modelKey,values.route.modelVersion,values.routePolicyId,values.routePolicyVersion,values.inputUnits,values.outputUnits,values.costMicros,values.cacheOutcome,values.latencyMs,values.now),
      this.db.prepare(`UPDATE ai_request_records SET status='completed',selected_provider_key=?1,selected_model_key=?2,selected_model_version=?3,stored_result_json=?4,generation=generation+1,updated_at=?5,completed_at=?5 WHERE tenant_id=?6 AND id=?7 AND status='processing'`).bind(values.route.providerKey,values.route.modelKey,values.route.modelVersion,JSON.stringify(values.result),values.now,values.tenantId,values.requestId),
    ];
    leases.forEach((lease)=>statements.push(
      this.db.prepare(`UPDATE ai_budget_leases SET status='released',released_at=?1,updated_at=?1 WHERE tenant_id=?2 AND id=?3 AND status='active' AND fencing_token=?4`).bind(values.now,values.tenantId,lease.id,lease.fencing_token),
    ));
    await this.db.batch(statements);
  }
  async expireBudgetLeases(now:number,limit=50):Promise<number>{
    const bounded=Math.max(1,Math.min(limit,100));
    const leases=(await this.db.prepare(`SELECT id,tenant_id,budget_id,fencing_token FROM ai_budget_leases WHERE status='active' AND expires_at<=?1 ORDER BY expires_at,id LIMIT ?2`).bind(now,bounded).all<{id:string;tenant_id:string;budget_id:string;fencing_token:number}>()).results;
    let expired=0;
    for(const lease of leases){
      await this.db.batch([
        this.db.prepare(`UPDATE ai_budget_leases SET status='expired',updated_at=?1 WHERE id=?2 AND tenant_id=?3 AND status='active' AND fencing_token=?4`).bind(now,lease.id,lease.tenant_id,lease.fencing_token),
      ]);
      expired+=1;
    }
    return expired;
  }
  async getCache(tenantId:string,applicationId:string,cacheKey:string,now:number){return this.db.prepare(`SELECT response_json FROM ai_cache_entries WHERE tenant_id=?1 AND application_id=?2 AND cache_key=?3 AND status='active' AND expires_at>?4`).bind(tenantId,applicationId,cacheKey,now).first<{response_json:string}>();}
  putCache(values:{cacheKey:string;tenantId:string;applicationId:string;taskKey:string;inputDigest:string;schemaDigest:string;locale:string;policyVersion:number;routeKey:string;responseDigest:string;response:Readonly<Record<string,unknown>>;expiresAt:number;now:number}){return this.db.prepare(`INSERT OR IGNORE INTO ai_cache_entries(cache_key,tenant_id,application_id,task_key,task_version,input_digest,schema_digest,locale,policy_version,route_compatibility_key,response_digest,response_json,status,expires_at,version,created_at,updated_at) VALUES(?1,?2,?3,?4,1,?5,?6,?7,?8,?9,?10,?11,'active',?12,1,?13,?13)`).bind(values.cacheKey,values.tenantId,values.applicationId,values.taskKey,values.inputDigest,values.schemaDigest,values.locale,values.policyVersion,values.routeKey,values.responseDigest,JSON.stringify(values.response),values.expiresAt,values.now).run();}
  async usageSummary(tenantId:string,applicationId:string):Promise<AiUsageSummary>{const row=await this.db.prepare(`SELECT count(*) requests,coalesce(sum(input_units),0) input_units,coalesce(sum(output_units),0) output_units,coalesce(sum(estimated_cost_micros),0) estimated_cost_micros FROM ai_usage_records WHERE tenant_id=?1 AND application_id=?2`).bind(tenantId,applicationId).first<{requests:number;input_units:number;output_units:number;estimated_cost_micros:number}>();return{requests:row?.requests??0,inputUnits:row?.input_units??0,outputUnits:row?.output_units??0,estimatedCostMicros:row?.estimated_cost_micros??0};}
}
