PRAGMA foreign_keys = ON;

-- Conversational Workbench permissions are registered only by this reviewed migration.
DROP TRIGGER trg_permissions_immutable_insert;
INSERT INTO permissions (id, permission_key, description, status, created_at, updated_at) VALUES
 ('019e0000-0000-7000-8000-000000000401','conversation:use','Use conversational workbench','active',1788393600000,1788393600000),
 ('019e0000-0000-7000-8000-000000000402','conversation:read_self','Read own conversations','active',1788393600000,1788393600000),
 ('019e0000-0000-7000-8000-000000000403','conversation:read_tenant','Read tenant conversations','active',1788393600000,1788393600000),
 ('019e0000-0000-7000-8000-000000000404','conversation:manage','Manage tenant conversations','active',1788393600000,1788393600000),
 ('019e0000-0000-7000-8000-000000000405','workbench_intent:read','Read workbench intent registry','active',1788393600000,1788393600000),
 ('019e0000-0000-7000-8000-000000000406','workbench_intent:manage','Manage workbench intent versions','active',1788393600000,1788393600000),
 ('019e0000-0000-7000-8000-000000000407','operation_plan:read','Read operation plans','active',1788393600000,1788393600000),
 ('019e0000-0000-7000-8000-000000000408','operation_plan:execute','Execute approved operation plans','active',1788393600000,1788393600000);
CREATE TRIGGER trg_permissions_immutable_insert BEFORE INSERT ON permissions
BEGIN SELECT RAISE(ABORT,'permission_vocabulary_immutable'); END;

CREATE TABLE conversation_sessions (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, actor_membership_id TEXT NOT NULL,
 channel_key TEXT NOT NULL CHECK(length(channel_key) BETWEEN 1 AND 40),
 status TEXT NOT NULL CHECK(status IN ('active','waiting_for_input','waiting_for_confirmation','processing','completed','cancelled','expired')),
 active_intent_key TEXT CHECK(active_intent_key IS NULL OR length(active_intent_key) BETWEEN 1 AND 100),
 current_step_key TEXT CHECK(current_step_key IS NULL OR length(current_step_key) BETWEEN 1 AND 80),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000),
 expires_at INTEGER NOT NULL CHECK(expires_at>=0),
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,actor_membership_id) REFERENCES tenant_memberships(tenant_id,id) ON DELETE RESTRICT
);

CREATE TABLE conversation_messages (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
 message_key TEXT NOT NULL CHECK(length(message_key) BETWEEN 1 AND 120),
 message_digest TEXT NOT NULL CHECK(length(message_digest)=64),
 resolved_intent_key TEXT CHECK(resolved_intent_key IS NULL OR length(resolved_intent_key) BETWEEN 1 AND 100),
 response_status TEXT NOT NULL CHECK(response_status IN ('understood','clarification_required','action_required','confirmation_required','processing','succeeded','failed','cancelled')),
 response_json TEXT NOT NULL CHECK(json_valid(response_json) AND json_type(response_json)='object' AND length(response_json)<=8192),
 created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,conversation_id,message_key),
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,conversation_id) REFERENCES conversation_sessions(tenant_id,id) ON DELETE RESTRICT
);

CREATE TABLE intent_registry (
 intent_key TEXT NOT NULL CHECK(length(intent_key) BETWEEN 1 AND 100),
 intent_version INTEGER NOT NULL CHECK(intent_version BETWEEN 1 AND 1000000),
 display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 120),
 module_key TEXT NOT NULL CHECK(length(module_key) BETWEEN 1 AND 80),
 operation_key TEXT NOT NULL CHECK(length(operation_key) BETWEEN 1 AND 100),
 required_permission TEXT NOT NULL,
 risk_level TEXT NOT NULL CHECK(risk_level IN ('read','low','elevated','high')),
 required_slots_json TEXT NOT NULL CHECK(json_valid(required_slots_json) AND json_type(required_slots_json)='array' AND length(required_slots_json)<=2048),
 optional_slots_json TEXT NOT NULL CHECK(json_valid(optional_slots_json) AND json_type(optional_slots_json)='array' AND length(optional_slots_json)<=2048),
 confirmation_policy TEXT NOT NULL CHECK(confirmation_policy IN ('none','summary_confirmation','explicit_confirmation','second_factor_required_future')),
 response_template_key TEXT NOT NULL CHECK(length(response_template_key) BETWEEN 1 AND 100),
 status TEXT NOT NULL CHECK(status IN ('active','retired')),
 created_at INTEGER NOT NULL CHECK(created_at>=0),
 PRIMARY KEY(intent_key,intent_version),
 FOREIGN KEY(required_permission) REFERENCES permissions(permission_key) ON DELETE RESTRICT
);

CREATE TABLE conversation_slot_values (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
 slot_key TEXT NOT NULL CHECK(length(slot_key) BETWEEN 1 AND 80),
 slot_type TEXT NOT NULL CHECK(slot_type IN ('string','integer','boolean','date','datetime','enum','application_reference','module_reference','support_code')),
 value_json TEXT NOT NULL CHECK(json_valid(value_json) AND length(value_json)<=2048),
 revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 1000000),
 status TEXT NOT NULL CHECK(status IN ('current','superseded')),
 created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,conversation_id,slot_key,revision),
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,conversation_id) REFERENCES conversation_sessions(tenant_id,id) ON DELETE RESTRICT
);

CREATE TABLE operation_plans (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
 plan_version INTEGER NOT NULL CHECK(plan_version BETWEEN 1 AND 1000000),
 intent_key TEXT NOT NULL, intent_version INTEGER NOT NULL,
 module_key TEXT NOT NULL CHECK(length(module_key) BETWEEN 1 AND 80),
 operation_key TEXT NOT NULL CHECK(length(operation_key) BETWEEN 1 AND 100),
 safe_parameter_digest TEXT NOT NULL CHECK(length(safe_parameter_digest)=64),
 parameters_json TEXT NOT NULL CHECK(json_valid(parameters_json) AND json_type(parameters_json)='object' AND length(parameters_json)<=8192),
 risk_level TEXT NOT NULL CHECK(risk_level IN ('read','low','elevated','high')),
 confirmation_required INTEGER NOT NULL CHECK(confirmation_required IN (0,1)),
 confirmation_status TEXT NOT NULL CHECK(confirmation_status IN ('not_required','pending','approved','rejected')),
 access_snapshot_reference TEXT NOT NULL CHECK(length(access_snapshot_reference) BETWEEN 1 AND 512),
 idempotency_key TEXT NOT NULL CHECK(length(idempotency_key) BETWEEN 1 AND 120),
 status TEXT NOT NULL CHECK(status IN ('prepared','awaiting_confirmation','approved','executing','succeeded','failed','cancelled','expired')),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000),
 expires_at INTEGER NOT NULL CHECK(expires_at>=0),
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,conversation_id,plan_version), UNIQUE(tenant_id,idempotency_key),
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,conversation_id) REFERENCES conversation_sessions(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(intent_key,intent_version) REFERENCES intent_registry(intent_key,intent_version) ON DELETE RESTRICT
);

CREATE TABLE operation_confirmations (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, operation_plan_id TEXT NOT NULL,
 actor_membership_id TEXT NOT NULL, plan_version INTEGER NOT NULL,
 confirmation_key TEXT NOT NULL CHECK(length(confirmation_key) BETWEEN 1 AND 120),
 decision TEXT NOT NULL CHECK(decision IN ('approved','rejected')),
 created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,operation_plan_id,confirmation_key),
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,operation_plan_id) REFERENCES operation_plans(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,actor_membership_id) REFERENCES tenant_memberships(tenant_id,id) ON DELETE RESTRICT
);

CREATE TABLE operation_execution_records (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, operation_plan_id TEXT NOT NULL,
 idempotency_key TEXT NOT NULL CHECK(length(idempotency_key) BETWEEN 1 AND 120),
 status TEXT NOT NULL CHECK(status IN ('succeeded','failed')),
 response_json TEXT NOT NULL CHECK(json_valid(response_json) AND json_type(response_json)='object' AND length(response_json)<=8192),
 support_code TEXT CHECK(support_code IS NULL OR length(support_code) BETWEEN 6 AND 32),
 started_at INTEGER NOT NULL CHECK(started_at>=0), completed_at INTEGER NOT NULL CHECK(completed_at>=started_at),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,operation_plan_id), UNIQUE(tenant_id,idempotency_key),
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,operation_plan_id) REFERENCES operation_plans(tenant_id,id) ON DELETE RESTRICT
);

CREATE INDEX idx_conversation_session_scope ON conversation_sessions(tenant_id,application_id,status,updated_at DESC,id);
CREATE INDEX idx_conversation_actor_active ON conversation_sessions(tenant_id,actor_membership_id,application_id,channel_key,status,expires_at);
CREATE INDEX idx_conversation_message_session ON conversation_messages(tenant_id,conversation_id,created_at,id);
CREATE INDEX idx_intent_registry_active ON intent_registry(status,intent_key,intent_version DESC);
CREATE UNIQUE INDEX uq_conversation_current_slot ON conversation_slot_values(tenant_id,conversation_id,slot_key) WHERE status='current';
CREATE INDEX idx_conversation_slot_history ON conversation_slot_values(tenant_id,conversation_id,slot_key,revision DESC);
CREATE INDEX idx_operation_plan_status_expiry ON operation_plans(tenant_id,application_id,status,expires_at,id);
CREATE INDEX idx_operation_plan_conversation ON operation_plans(tenant_id,conversation_id,plan_version DESC);
CREATE INDEX idx_operation_plan_idempotency ON operation_plans(tenant_id,idempotency_key,status);
CREATE INDEX idx_operation_confirmation_plan ON operation_confirmations(tenant_id,operation_plan_id,created_at,id);
CREATE INDEX idx_operation_execution_plan ON operation_execution_records(tenant_id,operation_plan_id,status);
CREATE INDEX idx_operation_execution_idempotency ON operation_execution_records(tenant_id,idempotency_key,status);

CREATE TRIGGER trg_conversation_terminal_guard BEFORE UPDATE ON conversation_sessions FOR EACH ROW WHEN OLD.status IN ('completed','cancelled','expired') BEGIN SELECT RAISE(ABORT,'conversation_terminal'); END;
CREATE TRIGGER trg_conversation_version_guard BEFORE UPDATE ON conversation_sessions FOR EACH ROW WHEN NEW.version<>OLD.version+1 OR NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id OR NEW.actor_membership_id IS NOT OLD.actor_membership_id OR NEW.channel_key IS NOT OLD.channel_key OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'conversation_version_conflict'); END;
CREATE TRIGGER trg_conversation_no_delete BEFORE DELETE ON conversation_sessions BEGIN SELECT RAISE(ABORT,'conversation_retained'); END;
CREATE TRIGGER trg_conversation_message_no_update BEFORE UPDATE ON conversation_messages BEGIN SELECT RAISE(ABORT,'conversation_message_immutable'); END;
CREATE TRIGGER trg_conversation_message_no_delete BEFORE DELETE ON conversation_messages BEGIN SELECT RAISE(ABORT,'conversation_message_immutable'); END;
CREATE TRIGGER trg_intent_registry_no_update BEFORE UPDATE ON intent_registry BEGIN SELECT RAISE(ABORT,'intent_version_immutable'); END;
CREATE TRIGGER trg_intent_registry_no_delete BEFORE DELETE ON intent_registry BEGIN SELECT RAISE(ABORT,'intent_version_immutable'); END;
CREATE TRIGGER trg_slot_revision_update_guard BEFORE UPDATE ON conversation_slot_values FOR EACH ROW WHEN NOT (OLD.status='current' AND NEW.status='superseded' AND NEW.id IS OLD.id AND NEW.tenant_id IS OLD.tenant_id AND NEW.application_id IS OLD.application_id AND NEW.conversation_id IS OLD.conversation_id AND NEW.slot_key IS OLD.slot_key AND NEW.slot_type IS OLD.slot_type AND NEW.value_json IS OLD.value_json AND NEW.revision IS OLD.revision AND NEW.created_at IS OLD.created_at) BEGIN SELECT RAISE(ABORT,'slot_revision_immutable'); END;
CREATE TRIGGER trg_slot_revision_no_delete BEFORE DELETE ON conversation_slot_values BEGIN SELECT RAISE(ABORT,'slot_revision_immutable'); END;
CREATE TRIGGER trg_operation_plan_identity_guard BEFORE UPDATE ON operation_plans FOR EACH ROW WHEN NEW.version<>OLD.version+1 OR NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id OR NEW.conversation_id IS NOT OLD.conversation_id OR NEW.plan_version IS NOT OLD.plan_version OR NEW.intent_key IS NOT OLD.intent_key OR NEW.intent_version IS NOT OLD.intent_version OR NEW.module_key IS NOT OLD.module_key OR NEW.operation_key IS NOT OLD.operation_key OR NEW.safe_parameter_digest IS NOT OLD.safe_parameter_digest OR NEW.parameters_json IS NOT OLD.parameters_json OR NEW.risk_level IS NOT OLD.risk_level OR NEW.confirmation_required IS NOT OLD.confirmation_required OR NEW.access_snapshot_reference IS NOT OLD.access_snapshot_reference OR NEW.idempotency_key IS NOT OLD.idempotency_key OR NEW.expires_at IS NOT OLD.expires_at OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'operation_plan_immutable'); END;
CREATE TRIGGER trg_operation_plan_no_delete BEFORE DELETE ON operation_plans BEGIN SELECT RAISE(ABORT,'operation_plan_retained'); END;
CREATE TRIGGER trg_operation_confirmation_no_update BEFORE UPDATE ON operation_confirmations BEGIN SELECT RAISE(ABORT,'operation_confirmation_immutable'); END;
CREATE TRIGGER trg_operation_confirmation_no_delete BEFORE DELETE ON operation_confirmations BEGIN SELECT RAISE(ABORT,'operation_confirmation_immutable'); END;
CREATE TRIGGER trg_operation_execution_no_update BEFORE UPDATE ON operation_execution_records BEGIN SELECT RAISE(ABORT,'operation_execution_immutable'); END;
CREATE TRIGGER trg_operation_execution_no_delete BEFORE DELETE ON operation_execution_records BEGIN SELECT RAISE(ABORT,'operation_execution_immutable'); END;

INSERT INTO intent_registry(intent_key,intent_version,display_name,module_key,operation_key,required_permission,risk_level,required_slots_json,optional_slots_json,confirmation_policy,response_template_key,status,created_at) VALUES
 ('event.create',1,'建立活動','event_engine','event.create','tenant:update','high','["activity_name","start_time","end_time","capacity"]','["location"]','explicit_confirmation','event.create','active',1788393600000),
 ('event.registration_summary',1,'活動報名狀況','event_engine','event.registration_summary','tenant:read','read','["event_reference"]','[]','none','event.registration_summary','active',1788393600000),
 ('event.list',1,'活動列表','event_engine','event.list','tenant:read','read','[]','[]','none','event.list','active',1788393600000),
 ('event.cancel',1,'取消活動','event_engine','event.cancel','tenant:update','high','["event_reference"]','[]','explicit_confirmation','event.cancel','active',1788393600000),
 ('network.my_commission',1,'我的佣金','business_network_engine','network.my_commission','commission:read_self','read','[]','["from","until"]','none','network.my_commission','active',1788393600000),
 ('network.my_performance',1,'推薦業績','business_network_engine','network.my_performance','sales:read','read','[]','["from","until"]','none','network.my_performance','active',1788393600000),
 ('network.my_referrals',1,'我的推薦','business_network_engine','network.my_referrals','referral:read','read','[]','["from","until","limit"]','none','network.my_referrals','active',1788393600000),
 ('module.list_available',1,'可用功能','application_assembly','module.list_available','module_catalog:read','read','[]','[]','none','module.list_available','active',1788393600000),
 ('module.enable',1,'啟用模組','application_assembly','module.enable','module_enablement:manage','high','["module_reference"]','[]','explicit_confirmation','module.enable','active',1788393600000),
 ('module.disable',1,'停用模組','application_assembly','module.disable','module_enablement:manage','high','["module_reference"]','[]','explicit_confirmation','module.disable','active',1788393600000),
 ('diagnostics.today_summary',1,'今日系統異常','platform_observability','diagnostics.today_summary','diagnostics:read_tenant','read','[]','[]','none','diagnostics.today_summary','active',1788393600000),
 ('diagnostics.lookup_support_code',1,'查詢支援碼','platform_observability','diagnostics.lookup_support_code','diagnostics:read_tenant','read','["support_code"]','[]','none','diagnostics.lookup_support_code','active',1788393600000);
