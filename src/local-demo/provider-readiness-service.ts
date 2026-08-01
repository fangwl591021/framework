import type { UuidV7 } from "../core/uuidv7";
import { AiProviderGovernanceService, type ProviderDrillKey } from "../ai-provider-governance/application";
import type { ProviderGovernanceContext } from "../ai-provider-governance/models";
import { DisabledProviderGovernanceObservationAdapter } from "../ai-provider-governance/ports";
import { AiProviderGovernanceRepository } from "../ai-provider-governance/repository";

export const LOCAL_PROVIDER_DRILLS = [
  "provider_lifecycle_not_approved", "compliance_expired", "region_mismatch", "retention_violation", "secret_not_provisioned",
  "hard_cost_ceiling", "provider_kill_switch", "task_kill_switch", "shadow_plan_expired", "canary_not_approved",
  "provider_outage_rollback", "unsafe_output_rollback", "excessive_cost_rollback", "credential_compromise", "deterministic_only_restoration",
] as const;

export const localProviderGovernanceContext = (actorReference = "local-platform-operator"): ProviderGovernanceContext => ({
  source: "platform_operator_context", actorReference,
  permissions: ["ai_provider_enablement:manage", "ai_provider_kill_switch:manage", "ai_provider_readiness:evaluate", "ai_provider_drill:run"],
  correlationId: `local-governance-${crypto.randomUUID()}`,
});

export async function seedLocalProviderGovernance(db: D1Database, ids: UuidV7): Promise<void> {
  const repository = new AiProviderGovernanceRepository(db), now = Date.now();
  if (!(await repository.currentEnablement("disabled_generic_adapter", "1", "local"))) {
    const service = new AiProviderGovernanceService(repository, ids, new DisabledProviderGovernanceObservationAdapter(), () => now);
    let version = 0;
    for (const [index, state] of (["draft", "compliance_review", "security_review", "approved_for_shadow"] as const).entries())
      version = (await service.transitionLifecycle(localProviderGovernanceContext(), { providerKey: "disabled_generic_adapter", providerVersion: "1", environment: "local", to: state, expectedVersion: version, reason: `local-fixture-${state}`, evidenceReferences: [`local:evidence:${state}`], idempotencyKey: `local-provider-lifecycle-${index}` })).version;
  }
  const future = 4102444800000;
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO ai_provider_compliance_profiles(id,provider_key,provider_version,environment,profile_version,legal_entity,service_region,processing_regions_json,storage_regions_json,data_retention_mode,retention_days,training_usage_policy,subprocessors_reference,breach_notification_sla_hours,deletion_support,audit_support,data_export_support,customer_data_ownership,terms_version,privacy_policy_version,compliance_status,reviewed_at,reviewed_by,expires_at,created_at) VALUES('019f0000-0000-7000-8000-000000009501','disabled_generic_adapter','1','local',1,'Fictional Local Provider','local','[\"local\"]','[\"local\"]','none',0,'prohibited','local-fictional-reference',24,1,1,1,'customer_retained','fixture-v1','fixture-v1','approved',?1,'local-compliance-reviewer',?2,?1)").bind(now, future),
    db.prepare("INSERT OR IGNORE INTO ai_provider_data_policies VALUES('019f0000-0000-7000-8000-000000009502','disabled_generic_adapter','1','local',1,'confidential',0,0,0,1,1,1,0,1,1,'active',?1,?2)").bind(future, now),
    db.prepare("INSERT OR IGNORE INTO ai_provider_secret_references(id,secret_reference_id,provider_key,environment,reference_name,status,version,created_at,expires_at) VALUES('019f0000-0000-7000-8000-000000009503','local-planned-reference','disabled_generic_adapter','local','future-local-secret-reference','planned',1,?1,?2)").bind(now, future),
    db.prepare("INSERT OR IGNORE INTO ai_task_provider_allow_matrix VALUES('019f0000-0000-7000-8000-000000009504','disabled_generic_adapter','1','disabled','1','content.translation',1,'local','shadow_only','confidential','standard',1000,1000,1000,5000,1,'active',?1)").bind(now),
    db.prepare("INSERT OR IGNORE INTO ai_provider_hard_ceilings VALUES('019f0000-0000-7000-8000-000000009505','local','disabled_generic_adapter',1,100,100000,10,5,1000,1000,'fixture-v1','active',?1)").bind(now),
    db.prepare("INSERT OR IGNORE INTO ai_shadow_plans VALUES('019f0000-0000-7000-8000-000000009506','disabled_generic_adapter','content.translation',1,'local',1000,100,'confidential','[\"schema_validity\",\"safe_output\"]','{\"minimumSuccessRate\":95}','{\"maximumUnsafe\":0}',?1,?2,'approved',1,?1)").bind(now, future),
    db.prepare("INSERT OR IGNORE INTO ai_canary_plans VALUES('019f0000-0000-7000-8000-000000009507','disabled_generic_adapter','content.translation',1,'local','[\"local-tenant-fixture\"]','[\"local-application-fixture\"]',100,10,1000,?1,?2,'{\"successRate\":99}','{\"unsafe\":1}','local-rollback-owner',60,'draft',1,?1)").bind(now, future),
    db.prepare("INSERT OR IGNORE INTO ai_provider_rollback_plans VALUES('019f0000-0000-7000-8000-000000009508','disabled_generic_adapter','local','deterministic_only','[\"provider_outage\",\"unsafe_output\",\"excessive_cost\"]','[\"disable route\",\"drain inflight\",\"restore deterministic\"]','[\"no new provider request\",\"usage complete\",\"lease reclaimed\"]','local-rollback-owner',15,'approved',1,?1)").bind(now),
    ...["credential_compromise", "provider_outage", "unsafe_output", "excessive_cost", "data_region_violation", "retention_violation"].map((kind, index) => db.prepare("INSERT OR IGNORE INTO ai_provider_incident_runbooks VALUES(?1,'disabled_generic_adapter','local',?2,'[\"safe_signal\"]','[\"disable provider\",\"preserve safe evidence\"]','provider','[\"platform_operator\"]','[\"support_code\",\"incident_reference\"]','local-rollback-plan','[\"deterministic restored\"]','[\"review controls\"]','local-incident-owner',1,'approved',?3)").bind(`019f0000-0000-7000-8000-${String(9510 + index).padStart(12, "0")}`, kind, now)),
    ...["compliance", "architecture", "security", "shadow"].map((type, index) => db.prepare("INSERT OR IGNORE INTO ai_provider_approval_records VALUES(?1,'disabled_generic_adapter','1','local',?2,'approved',?3,?4,'LOCAL_FIXTURE',?5,?6,?7)").bind(`019f0000-0000-7000-8000-${String(9520 + index).padStart(12, "0")}`, type, `${type}_reviewer`, `${type}-fixture`, String(index + 1).repeat(64).slice(0, 64), future, now + index)),
  ].flat());
}

export class LocalProviderReadinessService {
  private readonly service: AiProviderGovernanceService;
  constructor(private readonly db: D1Database, ids: UuidV7, private readonly now: () => number = Date.now) {
    this.service = new AiProviderGovernanceService(new AiProviderGovernanceRepository(db), ids, new DisabledProviderGovernanceObservationAdapter(), now);
  }
  readiness(context: ProviderGovernanceContext) { return this.service.evaluate(context, "disabled_generic_adapter", "1", "local", "content.translation"); }
  async summary(context: ProviderGovernanceContext) {
    const assessment = await this.readiness(context);
    const [enablement, compliance, policy, secret, ceiling, shadow, canary, rollback, approvals] = await Promise.all([
      this.db.prepare("SELECT lifecycle_state,lifecycle_version FROM ai_provider_enablements WHERE provider_key='disabled_generic_adapter' AND environment='local' ORDER BY lifecycle_version DESC LIMIT 1").first(),
      this.db.prepare("SELECT compliance_status,service_region,retention_days,expires_at FROM ai_provider_compliance_profiles WHERE provider_key='disabled_generic_adapter' AND environment='local' ORDER BY profile_version DESC LIMIT 1").first(),
      this.db.prepare("SELECT allowed_sensitivity,require_zero_retention,require_regional_processing,redaction_required FROM ai_provider_data_policies WHERE provider_key='disabled_generic_adapter' AND environment='local' ORDER BY policy_version DESC LIMIT 1").first(),
      this.db.prepare("SELECT status,reference_name,environment FROM ai_provider_secret_references WHERE provider_key='disabled_generic_adapter' AND environment='local' ORDER BY version DESC LIMIT 1").first(),
      this.db.prepare("SELECT maximum_requests_per_day,maximum_estimated_cost_micros_per_day,maximum_concurrent_requests,pricing_version FROM ai_provider_hard_ceilings WHERE provider_key='disabled_generic_adapter' AND environment='local' ORDER BY version DESC LIMIT 1").first(),
      this.db.prepare("SELECT status,sample_rate_basis_points,maximum_daily_samples,expires_at FROM ai_shadow_plans WHERE provider_key='disabled_generic_adapter' AND environment='local' ORDER BY version DESC LIMIT 1").first(),
      this.db.prepare("SELECT status,percentage_basis_points,maximum_requests FROM ai_canary_plans WHERE provider_key='disabled_generic_adapter' AND environment='local' ORDER BY version DESC LIMIT 1").first(),
      this.db.prepare("SELECT target_mode,maximum_recovery_minutes,owner,status FROM ai_provider_rollback_plans WHERE provider_key='disabled_generic_adapter' AND environment='local' ORDER BY version DESC LIMIT 1").first(),
      this.db.prepare("SELECT approval_type,decision,reviewer_role,expires_at FROM ai_provider_approval_records WHERE provider_key='disabled_generic_adapter' AND environment='local' ORDER BY created_at").all(),
    ]);
    return { banner: "NOT PRODUCTION APPROVAL", provider: "fictional-local-disabled", externalProviderExecutable: false, maximumApprovedState: "approved_for_shadow", assessment, enablement, compliance, dataPolicy: policy, secretReference: secret, hardCeiling: ceiling, killSwitch: { state: "enabled", authority: "platform" }, shadowPlan: shadow, canaryPlan: canary, rollbackPlan: rollback, approvalEvidence: approvals.results, providerApiCalled: false, productionStateChanged: false };
  }
  listDrills(context: ProviderGovernanceContext) { if (!context.permissions.includes("ai_provider_drill:run")) throw new Error("AI_PROVIDER_GOVERNANCE_DENIED"); return LOCAL_PROVIDER_DRILLS.map((drill) => ({ drill, mode: "deterministic_local", network: "disabled", productionAuthority: false })); }
  runDrill(context: ProviderGovernanceContext, drill: string) { if (!LOCAL_PROVIDER_DRILLS.includes(drill as ProviderDrillKey)) throw new Error("DRILL_NOT_ALLOWED"); return this.service.runLocalDrill(context, drill as ProviderDrillKey); }
}
