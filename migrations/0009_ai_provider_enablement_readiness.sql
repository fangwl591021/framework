PRAGMA foreign_keys = ON;

-- Provider governance permissions are installed only by this reviewed migration.
DROP TRIGGER trg_permissions_immutable_insert;
INSERT INTO permissions (id,permission_key,description,status,created_at,updated_at) VALUES
 ('019f0000-0000-7000-8000-000000000901','ai_provider_enablement:read','Read provider enablement governance','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000902','ai_provider_enablement:manage','Manage provider enablement lifecycle','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000903','ai_provider_compliance:read','Read provider compliance metadata','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000904','ai_provider_compliance:manage','Manage provider compliance metadata','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000905','ai_provider_secret_reference:read','Read provider secret references without values','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000906','ai_provider_secret_reference:manage','Manage provider secret reference lifecycle','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000907','ai_provider_kill_switch:read','Read provider kill switch state','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000908','ai_provider_kill_switch:manage','Manage provider kill switches','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000909','ai_provider_readiness:read','Read provider readiness findings','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000910','ai_provider_readiness:evaluate','Evaluate provider readiness','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000911','ai_provider_approval:read','Read provider approval evidence','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000912','ai_provider_approval:manage','Manage provider approval evidence','active',1785628800000,1785628800000),
 ('019f0000-0000-7000-8000-000000000913','ai_provider_drill:run','Run local provider readiness drills','active',1785628800000,1785628800000);
CREATE TRIGGER trg_permissions_immutable_insert BEFORE INSERT ON permissions
BEGIN SELECT RAISE(ABORT,'permission_vocabulary_immutable'); END;

CREATE TABLE ai_provider_enablements (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 provider_key TEXT NOT NULL,
 provider_version TEXT NOT NULL CHECK(length(provider_version) BETWEEN 1 AND 40),
 environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')),
 lifecycle_state TEXT NOT NULL CHECK(lifecycle_state IN ('draft','compliance_review','security_review','approved_for_shadow','shadow_active','canary_approved','canary_active','production_approved','production_active','suspended','revoked','retired')),
 lifecycle_version INTEGER NOT NULL CHECK(lifecycle_version BETWEEN 1 AND 1000000000),
 actor_reference TEXT NOT NULL CHECK(length(actor_reference) BETWEEN 3 AND 160),
 permission_key TEXT NOT NULL CHECK(permission_key='ai_provider_enablement:manage'),
 reason_code TEXT NOT NULL CHECK(length(reason_code) BETWEEN 3 AND 80),
 evidence_references_json TEXT NOT NULL CHECK(json_valid(evidence_references_json) AND json_type(evidence_references_json)='array' AND json_array_length(evidence_references_json)<=20 AND length(evidence_references_json)<=2048),
 idempotency_record_id TEXT NOT NULL UNIQUE,
 audit_record_id TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(provider_key,provider_version,environment,lifecycle_version),
 FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT,
 FOREIGN KEY(idempotency_record_id) REFERENCES idempotency_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(audit_record_id) REFERENCES audit_records(id) ON DELETE RESTRICT
);

CREATE TABLE ai_provider_compliance_profiles (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), provider_key TEXT NOT NULL, provider_version TEXT NOT NULL CHECK(length(provider_version) BETWEEN 1 AND 40),
 environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')), profile_version INTEGER NOT NULL CHECK(profile_version>=1),
 legal_entity TEXT NOT NULL CHECK(length(legal_entity) BETWEEN 2 AND 160), service_region TEXT NOT NULL CHECK(length(service_region) BETWEEN 2 AND 40),
 processing_regions_json TEXT NOT NULL CHECK(json_valid(processing_regions_json) AND json_type(processing_regions_json)='array' AND json_array_length(processing_regions_json) BETWEEN 1 AND 20 AND length(processing_regions_json)<=1024),
 storage_regions_json TEXT NOT NULL CHECK(json_valid(storage_regions_json) AND json_type(storage_regions_json)='array' AND json_array_length(storage_regions_json) BETWEEN 1 AND 20 AND length(storage_regions_json)<=1024),
 data_retention_mode TEXT NOT NULL CHECK(data_retention_mode IN ('none','fixed','provider_managed')), retention_days INTEGER NOT NULL CHECK(retention_days BETWEEN 0 AND 3650),
 training_usage_policy TEXT NOT NULL CHECK(training_usage_policy IN ('prohibited','contractual_opt_out','allowed')), subprocessors_reference TEXT NOT NULL CHECK(length(subprocessors_reference) BETWEEN 3 AND 255),
 breach_notification_sla_hours INTEGER NOT NULL CHECK(breach_notification_sla_hours BETWEEN 1 AND 8760), deletion_support INTEGER NOT NULL CHECK(deletion_support IN (0,1)),
 audit_support INTEGER NOT NULL CHECK(audit_support IN (0,1)), data_export_support INTEGER NOT NULL CHECK(data_export_support IN (0,1)), customer_data_ownership TEXT NOT NULL CHECK(customer_data_ownership='customer_retained'),
 terms_version TEXT NOT NULL CHECK(length(terms_version) BETWEEN 1 AND 80), privacy_policy_version TEXT NOT NULL CHECK(length(privacy_policy_version) BETWEEN 1 AND 80),
 compliance_status TEXT NOT NULL CHECK(compliance_status IN ('incomplete','under_review','approved','rejected','expired')), reviewed_at INTEGER, reviewed_by TEXT CHECK(reviewed_by IS NULL OR length(reviewed_by) BETWEEN 3 AND 160),
 expires_at INTEGER NOT NULL CHECK(expires_at>=created_at), created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(provider_key,provider_version,environment,profile_version), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT,
 CHECK((compliance_status IN ('approved','rejected','expired') AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL) OR compliance_status IN ('incomplete','under_review'))
);

CREATE TABLE ai_provider_data_policies (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), provider_key TEXT NOT NULL, provider_version TEXT NOT NULL CHECK(length(provider_version) BETWEEN 1 AND 40),
 environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')), policy_version INTEGER NOT NULL CHECK(policy_version>=1),
 allowed_sensitivity TEXT NOT NULL CHECK(allowed_sensitivity IN ('public','internal','confidential','restricted')),
 allow_prompt_retention INTEGER NOT NULL CHECK(allow_prompt_retention IN (0,1)), allow_provider_training INTEGER NOT NULL CHECK(allow_provider_training IN (0,1)), allow_cross_region INTEGER NOT NULL CHECK(allow_cross_region IN (0,1)),
 require_zero_retention INTEGER NOT NULL CHECK(require_zero_retention IN (0,1)), require_regional_processing INTEGER NOT NULL CHECK(require_regional_processing IN (0,1)), require_deletion_capability INTEGER NOT NULL CHECK(require_deletion_capability IN (0,1)),
 maximum_retention_days INTEGER NOT NULL CHECK(maximum_retention_days BETWEEN 0 AND 3650), redaction_required INTEGER NOT NULL CHECK(redaction_required IN (0,1)), structured_output_required INTEGER NOT NULL CHECK(structured_output_required IN (0,1)),
 status TEXT NOT NULL CHECK(status IN ('draft','active','retired')), expires_at INTEGER NOT NULL CHECK(expires_at>=created_at), created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(provider_key,provider_version,environment,policy_version), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT,
 CHECK(require_zero_retention=0 OR (allow_prompt_retention=0 AND maximum_retention_days=0))
);

CREATE TABLE ai_provider_secret_references (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), secret_reference_id TEXT NOT NULL, provider_key TEXT NOT NULL,
 environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')), reference_name TEXT NOT NULL CHECK(length(reference_name) BETWEEN 3 AND 120 AND reference_name NOT LIKE '%=%'),
 status TEXT NOT NULL CHECK(status IN ('planned','provisioned_future','active_future','rotation_due','revoked','expired')), version INTEGER NOT NULL CHECK(version>=1),
 created_at INTEGER NOT NULL CHECK(created_at>=0), rotated_at INTEGER, expires_at INTEGER CHECK(expires_at IS NULL OR expires_at>=created_at), revoked_at INTEGER, last_validated_at INTEGER,
 UNIQUE(secret_reference_id,version), UNIQUE(provider_key,environment,version), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT,
 CHECK(status='planned'), CHECK(rotated_at IS NULL AND revoked_at IS NULL AND last_validated_at IS NULL)
);

CREATE TABLE ai_task_provider_allow_matrix (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), provider_key TEXT NOT NULL, provider_version TEXT NOT NULL CHECK(length(provider_version) BETWEEN 1 AND 40),
 model_key TEXT NOT NULL, model_version TEXT NOT NULL, task_key TEXT NOT NULL CHECK(task_key NOT IN ('*','all')), task_version INTEGER NOT NULL,
 environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')), enablement_mode TEXT NOT NULL CHECK(enablement_mode IN ('disabled','shadow_only')),
 allowed_sensitivity TEXT NOT NULL CHECK(allowed_sensitivity IN ('public','internal','confidential','restricted')), quality_tier TEXT NOT NULL CHECK(quality_tier IN ('deterministic','standard','high')),
 maximum_input_units INTEGER NOT NULL CHECK(maximum_input_units BETWEEN 1 AND 100000), maximum_output_units INTEGER NOT NULL CHECK(maximum_output_units BETWEEN 1 AND 100000),
 maximum_estimated_cost_micros INTEGER NOT NULL CHECK(maximum_estimated_cost_micros BETWEEN 0 AND 1000000000), maximum_latency_ms INTEGER NOT NULL CHECK(maximum_latency_ms BETWEEN 1 AND 120000),
 data_policy_version INTEGER NOT NULL CHECK(data_policy_version>=1), status TEXT NOT NULL CHECK(status IN ('active','disabled')), created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(provider_key,provider_version,model_key,model_version,task_key,task_version,environment),
 FOREIGN KEY(provider_key,model_key,model_version) REFERENCES ai_model_catalog(provider_key,model_key,model_version) ON DELETE RESTRICT,
 FOREIGN KEY(task_key,task_version) REFERENCES ai_task_registry(task_key,task_version) ON DELETE RESTRICT,
 FOREIGN KEY(provider_key,provider_version,environment,data_policy_version) REFERENCES ai_provider_data_policies(provider_key,provider_version,environment,policy_version) ON DELETE RESTRICT
);

CREATE TABLE ai_provider_kill_switches (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')),
 scope_type TEXT NOT NULL CHECK(scope_type IN ('platform','environment','provider','model','tenant','application','task','provider_task')), scope_key TEXT NOT NULL CHECK(length(scope_key) BETWEEN 3 AND 255),
 provider_key TEXT, model_key TEXT, task_key TEXT, tenant_id TEXT, application_id TEXT, state TEXT NOT NULL CHECK(state IN ('enabled','disabled','drain_only')),
 version INTEGER NOT NULL CHECK(version>=1), reason_code TEXT NOT NULL CHECK(length(reason_code) BETWEEN 3 AND 80), actor_reference TEXT NOT NULL CHECK(length(actor_reference) BETWEEN 3 AND 160),
 idempotency_record_id TEXT NOT NULL UNIQUE, audit_record_id TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(environment,scope_type,scope_key,version), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT, FOREIGN KEY(idempotency_record_id) REFERENCES idempotency_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(audit_record_id) REFERENCES audit_records(id) ON DELETE RESTRICT,
 CHECK((scope_type='platform' AND scope_key='platform' AND provider_key IS NULL AND model_key IS NULL AND task_key IS NULL AND tenant_id IS NULL AND application_id IS NULL) OR scope_type<>'platform')
);

CREATE TABLE ai_provider_hard_ceilings (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')),
 provider_key TEXT NOT NULL, version INTEGER NOT NULL CHECK(version>=1), maximum_requests_per_day INTEGER NOT NULL CHECK(maximum_requests_per_day>=0),
 maximum_estimated_cost_micros_per_day INTEGER NOT NULL CHECK(maximum_estimated_cost_micros_per_day>=0), maximum_premium_requests_per_day INTEGER NOT NULL CHECK(maximum_premium_requests_per_day>=0),
 maximum_concurrent_requests INTEGER NOT NULL CHECK(maximum_concurrent_requests>=1), maximum_input_units_per_request INTEGER NOT NULL CHECK(maximum_input_units_per_request>=1),
 maximum_output_units_per_request INTEGER NOT NULL CHECK(maximum_output_units_per_request>=1), pricing_version TEXT NOT NULL CHECK(length(pricing_version) BETWEEN 1 AND 80),
 status TEXT NOT NULL CHECK(status IN ('active','retired')), created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(provider_key,environment,version), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT
);

CREATE TABLE ai_provider_readiness_assessments (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), provider_key TEXT NOT NULL, provider_version TEXT NOT NULL, environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')),
 result TEXT NOT NULL CHECK(result IN ('ready','conditionally_ready','not_ready','ready_for_local_only')), score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
 findings_json TEXT NOT NULL CHECK(json_valid(findings_json) AND json_type(findings_json)='array' AND json_array_length(findings_json)<=50 AND length(findings_json)<=16384),
 evidence_digest TEXT NOT NULL CHECK(length(evidence_digest)=64 AND evidence_digest NOT GLOB '*[^0-9a-f]*'), evaluated_by TEXT NOT NULL CHECK(length(evaluated_by) BETWEEN 3 AND 160),
 evaluated_at INTEGER NOT NULL CHECK(evaluated_at>=0), expires_at INTEGER NOT NULL CHECK(expires_at>evaluated_at), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT
);

CREATE TABLE ai_provider_approval_records (
 approval_id TEXT PRIMARY KEY CHECK(length(approval_id)=36 AND substr(approval_id,15,1)='7'), provider_key TEXT NOT NULL, provider_version TEXT NOT NULL,
 environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')), approval_type TEXT NOT NULL CHECK(approval_type IN ('compliance','architecture','security','shadow','canary_future','production_future')),
 decision TEXT NOT NULL CHECK(decision IN ('approved','rejected','revoked','expired')), reviewer_role TEXT NOT NULL CHECK(length(reviewer_role) BETWEEN 3 AND 80), reviewer_reference TEXT NOT NULL CHECK(length(reviewer_reference) BETWEEN 3 AND 160),
 reason_code TEXT NOT NULL CHECK(length(reason_code) BETWEEN 3 AND 80), evidence_digest TEXT NOT NULL CHECK(length(evidence_digest)=64 AND evidence_digest NOT GLOB '*[^0-9a-f]*'),
 expires_at INTEGER NOT NULL CHECK(expires_at>created_at), created_at INTEGER NOT NULL CHECK(created_at>=0), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT,
 UNIQUE(provider_key,provider_version,environment,approval_type,reviewer_role,created_at)
);

CREATE TABLE ai_shadow_plans (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), provider_key TEXT NOT NULL, task_key TEXT NOT NULL, task_version INTEGER NOT NULL,
 environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')), sample_rate_basis_points INTEGER NOT NULL CHECK(sample_rate_basis_points BETWEEN 0 AND 10000),
 maximum_daily_samples INTEGER NOT NULL CHECK(maximum_daily_samples BETWEEN 0 AND 1000000), allowed_input_classification TEXT NOT NULL CHECK(allowed_input_classification IN ('public','internal','confidential')),
 comparison_metrics_json TEXT NOT NULL CHECK(json_valid(comparison_metrics_json) AND json_type(comparison_metrics_json)='array' AND json_array_length(comparison_metrics_json) BETWEEN 1 AND 20 AND length(comparison_metrics_json)<=2048),
 success_criteria_json TEXT NOT NULL CHECK(json_valid(success_criteria_json) AND json_type(success_criteria_json)='object' AND length(success_criteria_json)<=4096),
 failure_criteria_json TEXT NOT NULL CHECK(json_valid(failure_criteria_json) AND json_type(failure_criteria_json)='object' AND length(failure_criteria_json)<=4096),
 start_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK(expires_at>start_at), status TEXT NOT NULL CHECK(status IN ('draft','approved')),
 version INTEGER NOT NULL CHECK(version>=1), created_at INTEGER NOT NULL CHECK(created_at>=0), UNIQUE(provider_key,task_key,task_version,environment,version),
 FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT, FOREIGN KEY(task_key,task_version) REFERENCES ai_task_registry(task_key,task_version) ON DELETE RESTRICT
);

CREATE TABLE ai_canary_plans (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), provider_key TEXT NOT NULL, task_key TEXT NOT NULL, task_version INTEGER NOT NULL,
 environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')), tenant_allowlist_json TEXT NOT NULL CHECK(json_valid(tenant_allowlist_json) AND json_type(tenant_allowlist_json)='array' AND json_array_length(tenant_allowlist_json) BETWEEN 1 AND 100 AND length(tenant_allowlist_json)<=8192 AND tenant_allowlist_json NOT LIKE '%"*"%'),
 application_allowlist_json TEXT NOT NULL CHECK(json_valid(application_allowlist_json) AND json_type(application_allowlist_json)='array' AND json_array_length(application_allowlist_json) BETWEEN 1 AND 100 AND length(application_allowlist_json)<=8192 AND application_allowlist_json NOT LIKE '%"*"%'),
 percentage_basis_points INTEGER NOT NULL CHECK(percentage_basis_points BETWEEN 1 AND 1000), maximum_requests INTEGER NOT NULL CHECK(maximum_requests BETWEEN 1 AND 100000), maximum_estimated_cost_micros INTEGER NOT NULL CHECK(maximum_estimated_cost_micros>=0),
 start_at INTEGER NOT NULL, end_at INTEGER NOT NULL CHECK(end_at>start_at), success_thresholds_json TEXT NOT NULL CHECK(json_valid(success_thresholds_json) AND json_type(success_thresholds_json)='object' AND length(success_thresholds_json)<=4096),
 rollback_thresholds_json TEXT NOT NULL CHECK(json_valid(rollback_thresholds_json) AND json_type(rollback_thresholds_json)='object' AND length(rollback_thresholds_json)<=4096), rollback_owner TEXT NOT NULL CHECK(length(rollback_owner) BETWEEN 3 AND 160),
 minimum_observation_minutes INTEGER NOT NULL CHECK(minimum_observation_minutes BETWEEN 30 AND 10080), status TEXT NOT NULL CHECK(status='draft'), version INTEGER NOT NULL CHECK(version>=1), created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(provider_key,task_key,task_version,environment,version), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT, FOREIGN KEY(task_key,task_version) REFERENCES ai_task_registry(task_key,task_version) ON DELETE RESTRICT
);

CREATE TABLE ai_provider_rollback_plans (
 rollback_plan_id TEXT PRIMARY KEY CHECK(length(rollback_plan_id)=36 AND substr(rollback_plan_id,15,1)='7'), provider_key TEXT NOT NULL,
 environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')), target_mode TEXT NOT NULL CHECK(target_mode IN ('deterministic_only','cache_only','provider_disabled','task_disabled')),
 trigger_conditions_json TEXT NOT NULL CHECK(json_valid(trigger_conditions_json) AND json_type(trigger_conditions_json)='array' AND json_array_length(trigger_conditions_json) BETWEEN 1 AND 20 AND length(trigger_conditions_json)<=4096),
 steps_json TEXT NOT NULL CHECK(json_valid(steps_json) AND json_type(steps_json)='array' AND json_array_length(steps_json) BETWEEN 1 AND 20 AND length(steps_json)<=8192),
 verification_steps_json TEXT NOT NULL CHECK(json_valid(verification_steps_json) AND json_type(verification_steps_json)='array' AND json_array_length(verification_steps_json) BETWEEN 1 AND 20 AND length(verification_steps_json)<=4096),
 owner TEXT NOT NULL CHECK(length(owner) BETWEEN 3 AND 160), maximum_recovery_minutes INTEGER NOT NULL CHECK(maximum_recovery_minutes BETWEEN 1 AND 1440), status TEXT NOT NULL CHECK(status IN ('draft','approved','retired')),
 version INTEGER NOT NULL CHECK(version>=1), created_at INTEGER NOT NULL CHECK(created_at>=0), UNIQUE(provider_key,environment,version), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT
);

CREATE TABLE ai_provider_incident_runbooks (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), provider_key TEXT NOT NULL, environment TEXT NOT NULL CHECK(environment IN ('local','development','staging','production')),
 incident_type TEXT NOT NULL CHECK(incident_type IN ('credential_compromise','provider_outage','provider_rate_limit','excessive_cost','unsafe_output','data_region_violation','retention_violation','provider_policy_change','model_retirement','latency_degradation')),
 detection_signals_json TEXT NOT NULL CHECK(json_valid(detection_signals_json) AND json_type(detection_signals_json)='array' AND length(detection_signals_json)<=4096), immediate_actions_json TEXT NOT NULL CHECK(json_valid(immediate_actions_json) AND json_type(immediate_actions_json)='array' AND length(immediate_actions_json)<=4096),
 kill_switch_scope TEXT NOT NULL CHECK(kill_switch_scope IN ('platform','environment','provider','model','task','provider_task')), communication_audience_json TEXT NOT NULL CHECK(json_valid(communication_audience_json) AND json_type(communication_audience_json)='array' AND length(communication_audience_json)<=2048),
 evidence_to_preserve_json TEXT NOT NULL CHECK(json_valid(evidence_to_preserve_json) AND json_type(evidence_to_preserve_json)='array' AND length(evidence_to_preserve_json)<=4096), rollback_plan_reference TEXT NOT NULL CHECK(length(rollback_plan_reference) BETWEEN 3 AND 160),
 recovery_criteria_json TEXT NOT NULL CHECK(json_valid(recovery_criteria_json) AND json_type(recovery_criteria_json)='array' AND length(recovery_criteria_json)<=4096), post_incident_review_json TEXT NOT NULL CHECK(json_valid(post_incident_review_json) AND json_type(post_incident_review_json)='array' AND length(post_incident_review_json)<=4096),
 owner TEXT NOT NULL CHECK(length(owner) BETWEEN 3 AND 160), version INTEGER NOT NULL CHECK(version>=1), status TEXT NOT NULL CHECK(status IN ('draft','approved','retired')), created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(provider_key,environment,incident_type,version), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT
);

CREATE INDEX idx_ai_enablement_provider_env_status ON ai_provider_enablements(provider_key,environment,lifecycle_state,lifecycle_version DESC);
CREATE INDEX idx_ai_compliance_expiry ON ai_provider_compliance_profiles(provider_key,environment,compliance_status,expires_at,profile_version DESC);
CREATE INDEX idx_ai_data_policy_lookup ON ai_provider_data_policies(provider_key,environment,status,policy_version DESC);
CREATE INDEX idx_ai_secret_reference_lookup ON ai_provider_secret_references(provider_key,environment,status,version DESC);
CREATE INDEX idx_ai_task_provider_matrix ON ai_task_provider_allow_matrix(task_key,task_version,provider_key,environment,status);
CREATE INDEX idx_ai_kill_switch_scope ON ai_provider_kill_switches(environment,scope_type,scope_key,version DESC);
CREATE INDEX idx_ai_hard_ceiling_lookup ON ai_provider_hard_ceilings(provider_key,environment,status,version DESC);
CREATE INDEX idx_ai_readiness_result ON ai_provider_readiness_assessments(provider_key,environment,result,evaluated_at DESC);
CREATE INDEX idx_ai_approval_expiry ON ai_provider_approval_records(provider_key,environment,approval_type,decision,expires_at);
CREATE INDEX idx_ai_shadow_status ON ai_shadow_plans(provider_key,environment,status,expires_at,task_key);
CREATE INDEX idx_ai_canary_status ON ai_canary_plans(provider_key,environment,status,start_at,end_at);
CREATE INDEX idx_ai_rollback_lookup ON ai_provider_rollback_plans(provider_key,environment,status,version DESC);
CREATE INDEX idx_ai_runbook_lookup ON ai_provider_incident_runbooks(provider_key,environment,incident_type,status,version DESC);

CREATE TRIGGER trg_ai_enablement_insert_guard BEFORE INSERT ON ai_provider_enablements FOR EACH ROW WHEN
 (NEW.lifecycle_version=1 AND NEW.lifecycle_state<>'draft') OR
 (NEW.lifecycle_state IN ('shadow_active','canary_approved','canary_active','production_approved','production_active')) OR
 (NEW.lifecycle_version>1 AND NOT EXISTS (
   SELECT 1 FROM ai_provider_enablements p WHERE p.provider_key=NEW.provider_key AND p.provider_version=NEW.provider_version AND p.environment=NEW.environment AND p.lifecycle_version=NEW.lifecycle_version-1 AND (
    (p.lifecycle_state='draft' AND NEW.lifecycle_state IN ('compliance_review','suspended','revoked')) OR
    (p.lifecycle_state='compliance_review' AND NEW.lifecycle_state IN ('security_review','suspended','revoked')) OR
    (p.lifecycle_state='security_review' AND NEW.lifecycle_state IN ('approved_for_shadow','suspended','revoked')) OR
    (p.lifecycle_state='approved_for_shadow' AND NEW.lifecycle_state IN ('suspended','revoked','retired')) OR
    (p.lifecycle_state='suspended' AND NEW.lifecycle_state IN ('compliance_review','revoked','retired'))
   )
 ))
BEGIN SELECT RAISE(ABORT,'ai_provider_lifecycle_transition_invalid'); END;

CREATE TRIGGER trg_ai_enablement_no_update BEFORE UPDATE ON ai_provider_enablements BEGIN SELECT RAISE(ABORT,'ai_provider_enablement_immutable'); END;
CREATE TRIGGER trg_ai_enablement_no_delete BEFORE DELETE ON ai_provider_enablements BEGIN SELECT RAISE(ABORT,'ai_provider_enablement_immutable'); END;
CREATE TRIGGER trg_ai_compliance_no_update BEFORE UPDATE ON ai_provider_compliance_profiles BEGIN SELECT RAISE(ABORT,'ai_provider_compliance_immutable'); END;
CREATE TRIGGER trg_ai_compliance_no_delete BEFORE DELETE ON ai_provider_compliance_profiles BEGIN SELECT RAISE(ABORT,'ai_provider_compliance_immutable'); END;
CREATE TRIGGER trg_ai_data_policy_no_update BEFORE UPDATE ON ai_provider_data_policies BEGIN SELECT RAISE(ABORT,'ai_provider_data_policy_immutable'); END;
CREATE TRIGGER trg_ai_data_policy_no_delete BEFORE DELETE ON ai_provider_data_policies BEGIN SELECT RAISE(ABORT,'ai_provider_data_policy_immutable'); END;
CREATE TRIGGER trg_ai_secret_reference_no_update BEFORE UPDATE ON ai_provider_secret_references BEGIN SELECT RAISE(ABORT,'ai_provider_secret_reference_immutable'); END;
CREATE TRIGGER trg_ai_secret_reference_no_delete BEFORE DELETE ON ai_provider_secret_references BEGIN SELECT RAISE(ABORT,'ai_provider_secret_reference_immutable'); END;
CREATE TRIGGER trg_ai_matrix_no_update BEFORE UPDATE ON ai_task_provider_allow_matrix BEGIN SELECT RAISE(ABORT,'ai_task_provider_matrix_immutable'); END;
CREATE TRIGGER trg_ai_matrix_no_delete BEFORE DELETE ON ai_task_provider_allow_matrix BEGIN SELECT RAISE(ABORT,'ai_task_provider_matrix_immutable'); END;
CREATE TRIGGER trg_ai_kill_switch_version_guard BEFORE INSERT ON ai_provider_kill_switches FOR EACH ROW WHEN NEW.version<>(SELECT coalesce(max(version),0)+1 FROM ai_provider_kill_switches WHERE environment=NEW.environment AND scope_type=NEW.scope_type AND scope_key=NEW.scope_key) BEGIN SELECT RAISE(ABORT,'ai_kill_switch_version_conflict'); END;
CREATE TRIGGER trg_ai_kill_switch_no_update BEFORE UPDATE ON ai_provider_kill_switches BEGIN SELECT RAISE(ABORT,'ai_kill_switch_immutable'); END;
CREATE TRIGGER trg_ai_kill_switch_no_delete BEFORE DELETE ON ai_provider_kill_switches BEGIN SELECT RAISE(ABORT,'ai_kill_switch_immutable'); END;
CREATE TRIGGER trg_ai_hard_ceiling_no_update BEFORE UPDATE ON ai_provider_hard_ceilings BEGIN SELECT RAISE(ABORT,'ai_hard_ceiling_immutable'); END;
CREATE TRIGGER trg_ai_hard_ceiling_no_delete BEFORE DELETE ON ai_provider_hard_ceilings BEGIN SELECT RAISE(ABORT,'ai_hard_ceiling_immutable'); END;
CREATE TRIGGER trg_ai_readiness_no_update BEFORE UPDATE ON ai_provider_readiness_assessments BEGIN SELECT RAISE(ABORT,'ai_readiness_immutable'); END;
CREATE TRIGGER trg_ai_readiness_no_delete BEFORE DELETE ON ai_provider_readiness_assessments BEGIN SELECT RAISE(ABORT,'ai_readiness_immutable'); END;
CREATE TRIGGER trg_ai_approval_no_update BEFORE UPDATE ON ai_provider_approval_records BEGIN SELECT RAISE(ABORT,'ai_provider_approval_immutable'); END;
CREATE TRIGGER trg_ai_approval_no_delete BEFORE DELETE ON ai_provider_approval_records BEGIN SELECT RAISE(ABORT,'ai_provider_approval_immutable'); END;
CREATE TRIGGER trg_ai_shadow_no_update BEFORE UPDATE ON ai_shadow_plans BEGIN SELECT RAISE(ABORT,'ai_shadow_plan_immutable'); END;
CREATE TRIGGER trg_ai_shadow_no_delete BEFORE DELETE ON ai_shadow_plans BEGIN SELECT RAISE(ABORT,'ai_shadow_plan_immutable'); END;
CREATE TRIGGER trg_ai_canary_no_update BEFORE UPDATE ON ai_canary_plans BEGIN SELECT RAISE(ABORT,'ai_canary_plan_immutable'); END;
CREATE TRIGGER trg_ai_canary_no_delete BEFORE DELETE ON ai_canary_plans BEGIN SELECT RAISE(ABORT,'ai_canary_plan_immutable'); END;
CREATE TRIGGER trg_ai_rollback_no_update BEFORE UPDATE ON ai_provider_rollback_plans BEGIN SELECT RAISE(ABORT,'ai_rollback_plan_immutable'); END;
CREATE TRIGGER trg_ai_rollback_no_delete BEFORE DELETE ON ai_provider_rollback_plans BEGIN SELECT RAISE(ABORT,'ai_rollback_plan_immutable'); END;
CREATE TRIGGER trg_ai_runbook_no_update BEFORE UPDATE ON ai_provider_incident_runbooks BEGIN SELECT RAISE(ABORT,'ai_incident_runbook_immutable'); END;
CREATE TRIGGER trg_ai_runbook_no_delete BEFORE DELETE ON ai_provider_incident_runbooks BEGIN SELECT RAISE(ABORT,'ai_incident_runbook_immutable'); END;
