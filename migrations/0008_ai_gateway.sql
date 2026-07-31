PRAGMA foreign_keys = ON;

-- AI Gateway permissions are installed only inside this reviewed migration.
DROP TRIGGER trg_permissions_immutable_insert;
INSERT INTO permissions (id, permission_key, description, status, created_at, updated_at) VALUES
 ('019f0000-0000-7000-8000-000000000801','ai_task:read','Read AI task contracts','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000802','ai_task:manage','Manage AI task contracts','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000803','ai_provider:read','Read AI provider catalog','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000804','ai_provider:manage','Manage AI provider catalog','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000805','ai_policy:read','Read AI route policies','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000806','ai_policy:manage','Manage AI route policies','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000807','ai_usage:read_self','Read own AI usage','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000808','ai_usage:read_tenant','Read tenant AI usage','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000809','ai_usage:read_platform','Read platform AI usage','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000810','ai_budget:read','Read AI budgets','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000811','ai_budget:manage','Manage AI budgets','active',1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000812','ai_gateway:invoke','Invoke approved AI tasks','active',1785542400000,1785542400000);
CREATE TRIGGER trg_permissions_immutable_insert BEFORE INSERT ON permissions
BEGIN SELECT RAISE(ABORT,'permission_vocabulary_immutable'); END;

CREATE TABLE ai_task_registry (
 task_key TEXT NOT NULL CHECK(length(task_key) BETWEEN 3 AND 100), task_version INTEGER NOT NULL CHECK(task_version BETWEEN 1 AND 1000000),
 category TEXT NOT NULL CHECK(category IN ('intent','clarification','diagnostics','rewrite','translation')),
 sensitivity_class TEXT NOT NULL CHECK(sensitivity_class IN ('low','standard','restricted')),
 quality_tier TEXT NOT NULL CHECK(quality_tier IN ('deterministic','standard','high')),
 cache_policy TEXT NOT NULL CHECK(cache_policy IN ('disabled','exact_digest')),
 max_input_units INTEGER NOT NULL CHECK(max_input_units BETWEEN 1 AND 100000), max_output_units INTEGER NOT NULL CHECK(max_output_units BETWEEN 1 AND 100000),
 capabilities_json TEXT NOT NULL CHECK(json_valid(capabilities_json) AND json_type(capabilities_json)='array' AND length(capabilities_json)<=2048),
 status TEXT NOT NULL CHECK(status IN ('active','disabled','retired')), created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 PRIMARY KEY(task_key,task_version)
);

CREATE TABLE ai_provider_catalog (
 provider_key TEXT PRIMARY KEY CHECK(length(provider_key) BETWEEN 3 AND 80), adapter_version TEXT NOT NULL CHECK(length(adapter_version) BETWEEN 1 AND 40),
 status TEXT NOT NULL CHECK(status IN ('enabled','disabled','retired')), capabilities_json TEXT NOT NULL CHECK(json_valid(capabilities_json) AND json_type(capabilities_json)='array' AND length(capabilities_json)<=2048),
 data_region TEXT NOT NULL CHECK(length(data_region) BETWEEN 2 AND 40), retention_policy TEXT NOT NULL CHECK(length(retention_policy) BETWEEN 2 AND 80),
 credential_secret_reference TEXT CHECK(credential_secret_reference IS NULL OR (credential_secret_reference LIKE 'secret:%' AND length(credential_secret_reference)<=120)),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000), created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at)
);

CREATE TABLE ai_model_catalog (
 provider_key TEXT NOT NULL, model_key TEXT NOT NULL CHECK(length(model_key) BETWEEN 1 AND 100), model_version TEXT NOT NULL CHECK(length(model_version) BETWEEN 1 AND 40),
 status TEXT NOT NULL CHECK(status IN ('enabled','disabled','retired')), capabilities_json TEXT NOT NULL CHECK(json_valid(capabilities_json) AND json_type(capabilities_json)='array' AND length(capabilities_json)<=2048),
 quality_score INTEGER NOT NULL CHECK(quality_score BETWEEN 0 AND 100), estimated_cost_micros INTEGER NOT NULL CHECK(estimated_cost_micros BETWEEN 0 AND 1000000000),
 max_input_units INTEGER NOT NULL CHECK(max_input_units BETWEEN 1 AND 100000), max_output_units INTEGER NOT NULL CHECK(max_output_units BETWEEN 1 AND 100000),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000), created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 PRIMARY KEY(provider_key,model_key,model_version), FOREIGN KEY(provider_key) REFERENCES ai_provider_catalog(provider_key) ON DELETE RESTRICT
);

CREATE TABLE ai_route_policies (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), scope_type TEXT NOT NULL CHECK(scope_type IN ('platform','tenant','application')),
 tenant_id TEXT, application_id TEXT, task_key TEXT NOT NULL, task_version INTEGER NOT NULL, quality_tier TEXT NOT NULL CHECK(quality_tier IN ('deterministic','standard','high')),
 route_chain_json TEXT NOT NULL CHECK(json_valid(route_chain_json) AND json_type(route_chain_json)='array' AND json_array_length(route_chain_json) BETWEEN 1 AND 2 AND length(route_chain_json)<=2048),
 max_cost_micros INTEGER NOT NULL CHECK(max_cost_micros BETWEEN 0 AND 1000000000), max_latency_ms INTEGER NOT NULL CHECK(max_latency_ms BETWEEN 1 AND 120000),
 cache_allowed INTEGER NOT NULL CHECK(cache_allowed IN (0,1)), status TEXT NOT NULL CHECK(status IN ('active','disabled','retired')),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000), created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,id), UNIQUE(id,version), FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(task_key,task_version) REFERENCES ai_task_registry(task_key,task_version) ON DELETE RESTRICT,
 CHECK((scope_type='platform' AND tenant_id IS NULL AND application_id IS NULL) OR (scope_type='tenant' AND tenant_id IS NOT NULL AND application_id IS NULL) OR (scope_type='application' AND tenant_id IS NOT NULL AND application_id IS NOT NULL))
);

CREATE TABLE ai_budgets (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), scope_type TEXT NOT NULL CHECK(scope_type IN ('platform','tenant','application')), scope_key TEXT NOT NULL CHECK(length(scope_key) BETWEEN 8 AND 160), tenant_id TEXT, application_id TEXT,
 window_key TEXT NOT NULL CHECK(length(window_key) BETWEEN 1 AND 80), window_started_at INTEGER NOT NULL CHECK(window_started_at>=0), window_ends_at INTEGER NOT NULL CHECK(window_ends_at>window_started_at),
 max_requests INTEGER NOT NULL CHECK(max_requests>=0), max_input_units INTEGER NOT NULL CHECK(max_input_units>=0), max_output_units INTEGER NOT NULL CHECK(max_output_units>=0), max_cost_micros INTEGER NOT NULL CHECK(max_cost_micros>=0), max_concurrent INTEGER NOT NULL CHECK(max_concurrent>=1),
 used_requests INTEGER NOT NULL DEFAULT 0 CHECK(used_requests BETWEEN 0 AND max_requests), used_input_units INTEGER NOT NULL DEFAULT 0 CHECK(used_input_units BETWEEN 0 AND max_input_units), used_output_units INTEGER NOT NULL DEFAULT 0 CHECK(used_output_units BETWEEN 0 AND max_output_units), used_cost_micros INTEGER NOT NULL DEFAULT 0 CHECK(used_cost_micros BETWEEN 0 AND max_cost_micros), concurrent_claims INTEGER NOT NULL DEFAULT 0 CHECK(concurrent_claims BETWEEN 0 AND max_concurrent),
 status TEXT NOT NULL CHECK(status IN ('active','closed')), version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000), created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,id), UNIQUE(scope_key,window_key), FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT, FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 CHECK((scope_type='platform' AND scope_key='platform' AND tenant_id IS NULL AND application_id IS NULL) OR (scope_type='tenant' AND scope_key='tenant:'||tenant_id AND tenant_id IS NOT NULL AND application_id IS NULL) OR (scope_type='application' AND scope_key='application:'||tenant_id||':'||application_id AND tenant_id IS NOT NULL AND application_id IS NOT NULL))
);

CREATE TABLE ai_request_records (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, actor_membership_id TEXT NOT NULL,
 task_key TEXT NOT NULL, task_version INTEGER NOT NULL, input_digest TEXT NOT NULL CHECK(length(input_digest)=64), idempotency_key_digest TEXT NOT NULL CHECK(length(idempotency_key_digest)=64),
 locale TEXT NOT NULL CHECK(length(locale) BETWEEN 2 AND 20), quality_tier TEXT NOT NULL CHECK(quality_tier IN ('deterministic','standard','high')), cache_directive TEXT NOT NULL CHECK(cache_directive IN ('allow','bypass')),
 requested_input_units INTEGER NOT NULL CHECK(requested_input_units BETWEEN 0 AND 100000), requested_output_units INTEGER NOT NULL CHECK(requested_output_units BETWEEN 0 AND 100000), requested_cost_micros INTEGER NOT NULL CHECK(requested_cost_micros BETWEEN 0 AND 1000000000),
 status TEXT NOT NULL CHECK(status IN ('prepared','processing','completed','rejected','failed')), selected_provider_key TEXT, selected_model_key TEXT, selected_model_version TEXT,
 generation INTEGER NOT NULL DEFAULT 1 CHECK(generation BETWEEN 1 AND 1000000000), stored_result_json TEXT CHECK(stored_result_json IS NULL OR (json_valid(stored_result_json) AND json_type(stored_result_json)='object' AND length(stored_result_json)<=4096)),
 failure_code TEXT CHECK(failure_code IS NULL OR length(failure_code)<=80), created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at), completed_at INTEGER,
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,application_id,task_key,idempotency_key_digest), FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,actor_membership_id) REFERENCES tenant_memberships(tenant_id,id) ON DELETE RESTRICT, FOREIGN KEY(task_key,task_version) REFERENCES ai_task_registry(task_key,task_version) ON DELETE RESTRICT,
 FOREIGN KEY(selected_provider_key,selected_model_key,selected_model_version) REFERENCES ai_model_catalog(provider_key,model_key,model_version) ON DELETE RESTRICT
);

CREATE TABLE ai_budget_leases (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), tenant_id TEXT NOT NULL, application_id TEXT, budget_id TEXT NOT NULL, request_id TEXT NOT NULL,
 fencing_token INTEGER NOT NULL CHECK(fencing_token>=1), reserved_input_units INTEGER NOT NULL CHECK(reserved_input_units>=0), reserved_output_units INTEGER NOT NULL CHECK(reserved_output_units>=0), reserved_cost_micros INTEGER NOT NULL CHECK(reserved_cost_micros>=0),
 status TEXT NOT NULL CHECK(status IN ('active','released','expired')), expires_at INTEGER NOT NULL CHECK(expires_at>=0), released_at INTEGER,
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,id), UNIQUE(budget_id,request_id), FOREIGN KEY(budget_id) REFERENCES ai_budgets(id) ON DELETE RESTRICT, FOREIGN KEY(tenant_id,request_id) REFERENCES ai_request_records(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT
);

CREATE TABLE ai_usage_records (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, actor_membership_id TEXT NOT NULL, request_id TEXT NOT NULL,
 task_key TEXT NOT NULL, task_version INTEGER NOT NULL, provider_key TEXT NOT NULL, model_key TEXT NOT NULL, model_version TEXT NOT NULL, route_policy_id TEXT NOT NULL, route_policy_version INTEGER NOT NULL CHECK(route_policy_version>=1),
 input_units INTEGER NOT NULL CHECK(input_units>=0), output_units INTEGER NOT NULL CHECK(output_units>=0), estimated_cost_micros INTEGER NOT NULL CHECK(estimated_cost_micros>=0),
 cache_outcome TEXT NOT NULL CHECK(cache_outcome IN ('hit','miss','bypass','stale_hit','refreshed')), outcome TEXT NOT NULL CHECK(outcome IN ('completed','rejected','failed','fallback','cached')), latency_ms INTEGER NOT NULL CHECK(latency_ms>=0), failure_code TEXT CHECK(failure_code IS NULL OR length(failure_code)<=80), support_code TEXT CHECK(support_code IS NULL OR length(support_code)<=80), occurred_at INTEGER NOT NULL CHECK(occurred_at>=0),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,request_id), FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT, FOREIGN KEY(tenant_id,actor_membership_id) REFERENCES tenant_memberships(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,request_id) REFERENCES ai_request_records(tenant_id,id) ON DELETE RESTRICT, FOREIGN KEY(task_key,task_version) REFERENCES ai_task_registry(task_key,task_version) ON DELETE RESTRICT, FOREIGN KEY(route_policy_id,route_policy_version) REFERENCES ai_route_policies(id,version) ON DELETE RESTRICT,
 FOREIGN KEY(provider_key,model_key,model_version) REFERENCES ai_model_catalog(provider_key,model_key,model_version) ON DELETE RESTRICT
);

CREATE TABLE ai_cache_entries (
 cache_key TEXT PRIMARY KEY CHECK(length(cache_key)=64), tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, task_key TEXT NOT NULL, task_version INTEGER NOT NULL,
 input_digest TEXT NOT NULL CHECK(length(input_digest)=64), schema_digest TEXT NOT NULL CHECK(length(schema_digest)=64), locale TEXT NOT NULL CHECK(length(locale) BETWEEN 2 AND 20), policy_version INTEGER NOT NULL CHECK(policy_version>=1), route_compatibility_key TEXT NOT NULL CHECK(length(route_compatibility_key) BETWEEN 1 AND 160),
 response_digest TEXT NOT NULL CHECK(length(response_digest)=64), response_json TEXT NOT NULL CHECK(json_valid(response_json) AND json_type(response_json)='object' AND length(response_json)<=4096),
 status TEXT NOT NULL CHECK(status IN ('active','expired','invalidated')), expires_at INTEGER NOT NULL CHECK(expires_at>=0), version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1), created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,application_id,task_key,task_version,input_digest,schema_digest,locale,policy_version,route_compatibility_key), FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT, FOREIGN KEY(task_key,task_version) REFERENCES ai_task_registry(task_key,task_version) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_ai_route_platform_active ON ai_route_policies(task_key,task_version,quality_tier) WHERE scope_type='platform' AND status='active';
CREATE UNIQUE INDEX uq_ai_route_tenant_active ON ai_route_policies(tenant_id,task_key,task_version,quality_tier) WHERE scope_type='tenant' AND status='active';
CREATE UNIQUE INDEX uq_ai_route_application_active ON ai_route_policies(tenant_id,application_id,task_key,task_version,quality_tier) WHERE scope_type='application' AND status='active';
CREATE INDEX idx_ai_tasks_active ON ai_task_registry(status,category,task_key,task_version);
CREATE INDEX idx_ai_models_route ON ai_model_catalog(status,quality_score,estimated_cost_micros,provider_key);
CREATE INDEX idx_ai_routes_selection ON ai_route_policies(scope_type,tenant_id,application_id,task_key,task_version,quality_tier,status);
CREATE INDEX idx_ai_budgets_window ON ai_budgets(tenant_id,application_id,status,window_started_at,window_ends_at);
CREATE INDEX idx_ai_budget_leases_expiry ON ai_budget_leases(status,expires_at,tenant_id,budget_id);
CREATE INDEX idx_ai_requests_status ON ai_request_records(tenant_id,application_id,status,updated_at,id);
CREATE INDEX idx_ai_usage_tenant_time ON ai_usage_records(tenant_id,occurred_at DESC,id);
CREATE INDEX idx_ai_usage_application_task ON ai_usage_records(tenant_id,application_id,task_key,occurred_at DESC,id);
CREATE INDEX idx_ai_cache_lookup ON ai_cache_entries(tenant_id,application_id,task_key,status,expires_at,cache_key);
CREATE INDEX idx_ai_cache_expiry ON ai_cache_entries(status,expires_at,tenant_id,application_id);

CREATE TRIGGER trg_ai_task_no_delete BEFORE DELETE ON ai_task_registry BEGIN SELECT RAISE(ABORT,'ai_task_contract_retained'); END;
CREATE TRIGGER trg_ai_task_identity_guard BEFORE UPDATE ON ai_task_registry FOR EACH ROW WHEN NEW.task_key IS NOT OLD.task_key OR NEW.task_version IS NOT OLD.task_version OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'ai_task_identity_immutable'); END;
CREATE TRIGGER trg_ai_provider_version_guard BEFORE UPDATE ON ai_provider_catalog FOR EACH ROW WHEN NEW.provider_key IS NOT OLD.provider_key OR NEW.created_at IS NOT OLD.created_at OR NEW.version<>OLD.version+1 BEGIN SELECT RAISE(ABORT,'ai_provider_version_conflict'); END;
CREATE TRIGGER trg_ai_provider_no_delete BEFORE DELETE ON ai_provider_catalog BEGIN SELECT RAISE(ABORT,'ai_provider_retained'); END;
CREATE TRIGGER trg_ai_model_version_guard BEFORE UPDATE ON ai_model_catalog FOR EACH ROW WHEN NEW.provider_key IS NOT OLD.provider_key OR NEW.model_key IS NOT OLD.model_key OR NEW.model_version IS NOT OLD.model_version OR NEW.created_at IS NOT OLD.created_at OR NEW.version<>OLD.version+1 BEGIN SELECT RAISE(ABORT,'ai_model_version_conflict'); END;
CREATE TRIGGER trg_ai_model_no_delete BEFORE DELETE ON ai_model_catalog BEGIN SELECT RAISE(ABORT,'ai_model_retained'); END;
CREATE TRIGGER trg_ai_route_version_guard BEFORE UPDATE ON ai_route_policies FOR EACH ROW WHEN NEW.id IS NOT OLD.id OR NEW.scope_type IS NOT OLD.scope_type OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id OR NEW.task_key IS NOT OLD.task_key OR NEW.task_version IS NOT OLD.task_version OR NEW.created_at IS NOT OLD.created_at OR NEW.version<>OLD.version+1 BEGIN SELECT RAISE(ABORT,'ai_route_version_conflict'); END;
CREATE TRIGGER trg_ai_route_no_delete BEFORE DELETE ON ai_route_policies BEGIN SELECT RAISE(ABORT,'ai_route_retained'); END;
CREATE TRIGGER trg_ai_budget_version_guard BEFORE UPDATE ON ai_budgets FOR EACH ROW WHEN NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id OR NEW.scope_type IS NOT OLD.scope_type OR NEW.scope_key IS NOT OLD.scope_key OR NEW.window_key IS NOT OLD.window_key OR NEW.created_at IS NOT OLD.created_at OR NEW.version<>OLD.version+1 BEGIN SELECT RAISE(ABORT,'ai_budget_version_conflict'); END;
CREATE TRIGGER trg_ai_budget_no_delete BEFORE DELETE ON ai_budgets BEGIN SELECT RAISE(ABORT,'ai_budget_retained'); END;
CREATE TRIGGER trg_ai_lease_insert_guard BEFORE INSERT ON ai_budget_leases FOR EACH ROW WHEN NOT EXISTS (SELECT 1 FROM ai_budgets b WHERE b.id=NEW.budget_id AND (b.scope_type='platform' OR (b.tenant_id=NEW.tenant_id AND (b.application_id IS NULL OR b.application_id=NEW.application_id))) AND b.status='active' AND b.version=NEW.fencing_token AND b.concurrent_claims>=1 AND NEW.expires_at<=b.window_ends_at) BEGIN SELECT RAISE(ABORT,'ai_budget_claim_not_winner'); END;
CREATE TRIGGER trg_ai_lease_update_guard BEFORE UPDATE ON ai_budget_leases FOR EACH ROW WHEN NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.budget_id IS NOT OLD.budget_id OR NEW.request_id IS NOT OLD.request_id OR NEW.fencing_token IS NOT OLD.fencing_token OR NEW.created_at IS NOT OLD.created_at OR NOT (OLD.status='active' AND NEW.status IN ('released','expired')) OR NOT EXISTS (SELECT 1 FROM ai_budgets b WHERE b.id=OLD.budget_id AND b.concurrent_claims>0) BEGIN SELECT RAISE(ABORT,'ai_budget_lease_fenced'); END;
CREATE TRIGGER trg_ai_lease_release_budget AFTER UPDATE OF status ON ai_budget_leases FOR EACH ROW WHEN OLD.status='active' AND NEW.status IN ('released','expired') BEGIN UPDATE ai_budgets SET concurrent_claims=concurrent_claims-1,version=version+1,updated_at=NEW.updated_at WHERE id=NEW.budget_id AND concurrent_claims>0; END;
CREATE TRIGGER trg_ai_lease_no_delete BEFORE DELETE ON ai_budget_leases BEGIN SELECT RAISE(ABORT,'ai_budget_lease_retained'); END;
CREATE TRIGGER trg_ai_request_update_guard BEFORE UPDATE ON ai_request_records FOR EACH ROW WHEN NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id OR NEW.actor_membership_id IS NOT OLD.actor_membership_id OR NEW.task_key IS NOT OLD.task_key OR NEW.task_version IS NOT OLD.task_version OR NEW.input_digest IS NOT OLD.input_digest OR NEW.idempotency_key_digest IS NOT OLD.idempotency_key_digest OR NEW.created_at IS NOT OLD.created_at OR NEW.generation<>OLD.generation+1 OR NOT ((OLD.status='prepared' AND NEW.status IN ('processing','rejected','failed')) OR (OLD.status='processing' AND NEW.status IN ('completed','rejected','failed'))) BEGIN SELECT RAISE(ABORT,'ai_request_transition_fenced'); END;
CREATE TRIGGER trg_ai_request_no_delete BEFORE DELETE ON ai_request_records BEGIN SELECT RAISE(ABORT,'ai_request_retained'); END;
CREATE TRIGGER trg_ai_usage_no_update BEFORE UPDATE ON ai_usage_records BEGIN SELECT RAISE(ABORT,'ai_usage_immutable'); END;
CREATE TRIGGER trg_ai_usage_no_delete BEFORE DELETE ON ai_usage_records BEGIN SELECT RAISE(ABORT,'ai_usage_immutable'); END;
CREATE TRIGGER trg_ai_cache_update_guard BEFORE UPDATE ON ai_cache_entries FOR EACH ROW WHEN NEW.cache_key IS NOT OLD.cache_key OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id OR NEW.task_key IS NOT OLD.task_key OR NEW.task_version IS NOT OLD.task_version OR NEW.input_digest IS NOT OLD.input_digest OR NEW.response_digest IS NOT OLD.response_digest OR NEW.response_json IS NOT OLD.response_json OR NEW.created_at IS NOT OLD.created_at OR NEW.version<>OLD.version+1 OR NOT (OLD.status='active' AND NEW.status IN ('expired','invalidated')) BEGIN SELECT RAISE(ABORT,'ai_cache_transition_invalid'); END;
CREATE TRIGGER trg_ai_cache_no_delete BEFORE DELETE ON ai_cache_entries BEGIN SELECT RAISE(ABORT,'ai_cache_retained'); END;

INSERT INTO ai_task_registry VALUES
 ('workbench.intent_resolution',1,'intent','standard','deterministic','exact_digest',2000,512,'["structured_output","intent_allowlist"]','active',1785542400000,1785542400000),
 ('workbench.clarification_suggestion',1,'clarification','standard','deterministic','exact_digest',2000,512,'["safe_text"]','active',1785542400000,1785542400000),
 ('diagnostics.safe_summary',1,'diagnostics','restricted','standard','exact_digest',4000,1000,'["safe_text","redaction"]','active',1785542400000,1785542400000),
 ('content.safe_rewrite',1,'rewrite','standard','standard','exact_digest',4000,4000,'["safe_text"]','active',1785542400000,1785542400000),
 ('content.translation',1,'translation','standard','standard','exact_digest',4000,4000,'["safe_text","locale"]','active',1785542400000,1785542400000);
INSERT INTO ai_provider_catalog VALUES
 ('deterministic_local_adapter','1.0.0','enabled','["structured_output","safe_text","locale"]','local','no_external_retention',NULL,1,1785542400000,1785542400000),
 ('disabled_openai_adapter','1.0.0','disabled','[]','external','provider_contract_unapproved',NULL,1,1785542400000,1785542400000),
 ('disabled_generic_adapter','1.0.0','disabled','[]','external','provider_contract_unapproved',NULL,1,1785542400000,1785542400000);
INSERT INTO ai_model_catalog VALUES
 ('deterministic_local_adapter','deterministic-fixture','1','enabled','["structured_output","safe_text","locale"]',50,0,100000,100000,1,1785542400000,1785542400000),
 ('disabled_openai_adapter','disabled','1','disabled','[]',0,0,1,1,1,1785542400000,1785542400000),
 ('disabled_generic_adapter','disabled','1','disabled','[]',0,0,1,1,1,1785542400000,1785542400000);
INSERT INTO ai_route_policies VALUES
 ('019f0000-0000-7000-8000-000000000821','platform',NULL,NULL,'workbench.intent_resolution',1,'deterministic','[{"providerKey":"deterministic_local_adapter","modelKey":"deterministic-fixture","modelVersion":"1"}]',0,5000,1,'active',1,1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000822','platform',NULL,NULL,'workbench.clarification_suggestion',1,'deterministic','[{"providerKey":"deterministic_local_adapter","modelKey":"deterministic-fixture","modelVersion":"1"}]',0,5000,1,'active',1,1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000823','platform',NULL,NULL,'diagnostics.safe_summary',1,'standard','[{"providerKey":"deterministic_local_adapter","modelKey":"deterministic-fixture","modelVersion":"1"}]',0,5000,1,'active',1,1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000824','platform',NULL,NULL,'content.safe_rewrite',1,'standard','[{"providerKey":"deterministic_local_adapter","modelKey":"deterministic-fixture","modelVersion":"1"}]',0,5000,1,'active',1,1785542400000,1785542400000),
 ('019f0000-0000-7000-8000-000000000825','platform',NULL,NULL,'content.translation',1,'standard','[{"providerKey":"deterministic_local_adapter","modelKey":"deterministic-fixture","modelVersion":"1"}]',0,5000,1,'active',1,1785542400000,1785542400000);
