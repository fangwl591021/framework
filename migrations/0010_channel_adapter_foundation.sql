PRAGMA foreign_keys = ON;

-- Channel permissions are installed only by this reviewed migration.
DROP TRIGGER trg_permissions_immutable_insert;
INSERT INTO permissions (id,permission_key,description,status,created_at,updated_at) VALUES
 ('01a00000-0000-7000-8000-000000001001','channel_catalog:read','Read the platform channel catalog','active',1785628800000,1785628800000),
 ('01a00000-0000-7000-8000-000000001002','channel_account:read','Read tenant channel accounts','active',1785628800000,1785628800000),
 ('01a00000-0000-7000-8000-000000001003','channel_account:manage','Manage tenant channel accounts','active',1785628800000,1785628800000),
 ('01a00000-0000-7000-8000-000000001004','channel_identity:read','Read tenant channel identity links','active',1785628800000,1785628800000),
 ('01a00000-0000-7000-8000-000000001005','channel_identity:manage','Manage tenant channel identity links','active',1785628800000,1785628800000),
 ('01a00000-0000-7000-8000-000000001006','channel_event:read','Read tenant channel event metadata','active',1785628800000,1785628800000),
 ('01a00000-0000-7000-8000-000000001007','channel_delivery:read_self','Read own channel delivery evidence','active',1785628800000,1785628800000),
 ('01a00000-0000-7000-8000-000000001008','channel_delivery:read_tenant','Read tenant channel delivery evidence','active',1785628800000,1785628800000),
 ('01a00000-0000-7000-8000-000000001009','channel_adapter:invoke','Invoke an enabled channel adapter','active',1785628800000,1785628800000),
 ('01a00000-0000-7000-8000-000000001010','channel_lab:run','Run the local-only Channel Lab','active',1785628800000,1785628800000);
CREATE TRIGGER trg_permissions_immutable_insert BEFORE INSERT ON permissions
BEGIN SELECT RAISE(ABORT,'permission_vocabulary_immutable'); END;

CREATE TABLE channel_catalog (
 adapter_key TEXT PRIMARY KEY CHECK(length(adapter_key) BETWEEN 3 AND 80),
 channel_type TEXT NOT NULL CHECK(channel_type IN ('web','line','telegram','generic_webhook')),
 display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 3 AND 120),
 status TEXT NOT NULL CHECK(status IN ('enabled_local_only','disabled','retired')),
 local_only INTEGER NOT NULL CHECK(local_only IN (0,1)),
 capabilities_json TEXT NOT NULL CHECK(json_valid(capabilities_json) AND json_type(capabilities_json)='object' AND length(capabilities_json)<=2048),
 version INTEGER NOT NULL CHECK(version BETWEEN 1 AND 1000000000),
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 CHECK((status='enabled_local_only' AND local_only=1 AND channel_type='web') OR status IN ('disabled','retired'))
);

INSERT INTO channel_catalog(adapter_key,channel_type,display_name,status,local_only,capabilities_json,version,created_at,updated_at) VALUES
 ('local_web_adapter','web','Local Web Adapter','enabled_local_only',1,'{"maxTextLength":1000,"maxMessages":4,"supportsButtons":true,"supportsCards":true,"supportsReplyToken":false,"supportsPush":false,"supportsRichMenu":false,"localeSupport":["zh-TW","en"]}',1,1785628800000,1785628800000),
 ('disabled_line_adapter','line','Disabled LINE Adapter','disabled',0,'{"maxTextLength":5000,"maxMessages":5,"supportsButtons":true,"supportsCards":true,"supportsReplyToken":true,"supportsPush":false,"supportsRichMenu":true,"localeSupport":["zh-TW","en"]}',1,1785628800000,1785628800000),
 ('disabled_telegram_adapter','telegram','Disabled Telegram Adapter','disabled',0,'{"maxTextLength":4096,"maxMessages":4,"supportsButtons":true,"supportsCards":false,"supportsReplyToken":false,"supportsPush":false,"supportsRichMenu":false,"localeSupport":["zh-TW","en"]}',1,1785628800000,1785628800000),
 ('disabled_generic_webhook_adapter','generic_webhook','Disabled Generic Webhook Adapter','disabled',0,'{"maxTextLength":1000,"maxMessages":1,"supportsButtons":false,"supportsCards":false,"supportsReplyToken":false,"supportsPush":false,"supportsRichMenu":false,"localeSupport":["en"]}',1,1785628800000,1785628800000);

CREATE TABLE channel_accounts (
 channel_account_key TEXT PRIMARY KEY CHECK(length(channel_account_key) BETWEEN 3 AND 100),
 channel_type TEXT NOT NULL CHECK(channel_type IN ('web','line','telegram','generic_webhook')),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, adapter_key TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('draft','enabled_local_only','disabled','suspended','revoked')),
 signature_policy_version INTEGER NOT NULL CHECK(signature_policy_version BETWEEN 1 AND 1000000),
 response_policy_version INTEGER NOT NULL CHECK(response_policy_version BETWEEN 1 AND 1000000),
 secret_reference TEXT CHECK(secret_reference IS NULL OR (secret_reference LIKE 'planned:%' AND length(secret_reference)<=120)),
 version INTEGER NOT NULL CHECK(version BETWEEN 1 AND 1000000000),
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,application_id,channel_account_key), UNIQUE(tenant_id,channel_account_key),
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(adapter_key) REFERENCES channel_catalog(adapter_key) ON DELETE RESTRICT,
 CHECK((status='enabled_local_only' AND adapter_key='local_web_adapter' AND channel_type='web' AND secret_reference IS NULL) OR status<>'enabled_local_only')
);

CREATE TABLE channel_identity_links (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, channel_account_key TEXT NOT NULL,
 channel_type TEXT NOT NULL CHECK(channel_type IN ('web','line','telegram','generic_webhook')),
 external_user_reference_digest TEXT NOT NULL CHECK(external_user_reference_digest GLOB 'v[0-9]*:[0-9a-f]*' AND length(external_user_reference_digest) BETWEEN 67 AND 100),
 identity_id TEXT NOT NULL, membership_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('linked','suspended','revoked','pending')),
 verified_at INTEGER CHECK(verified_at IS NULL OR verified_at>=0),
 version INTEGER NOT NULL CHECK(version BETWEEN 1 AND 1000000000),
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,id), UNIQUE(channel_account_key,external_user_reference_digest),
 FOREIGN KEY(tenant_id,application_id,channel_account_key) REFERENCES channel_accounts(tenant_id,application_id,channel_account_key) ON DELETE RESTRICT,
 FOREIGN KEY(identity_id) REFERENCES identity_mappings(id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,membership_id) REFERENCES tenant_memberships(tenant_id,id) ON DELETE RESTRICT,
 CHECK((status='linked' AND verified_at IS NOT NULL) OR status<>'linked')
);

CREATE TABLE channel_inbound_events (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, channel_account_key TEXT NOT NULL,
 external_event_id TEXT NOT NULL CHECK(length(external_event_id) BETWEEN 1 AND 160),
 event_type TEXT NOT NULL CHECK(event_type IN ('text_message','postback','follow','unfollow','join','leave','delivery_receipt','unsupported')),
 occurred_at INTEGER NOT NULL CHECK(occurred_at>=0), received_at INTEGER NOT NULL CHECK(received_at>=occurred_at),
 payload_digest TEXT NOT NULL CHECK(length(payload_digest)=64 AND payload_digest NOT GLOB '*[^0-9a-f]*'),
 signature_digest TEXT NOT NULL CHECK(length(signature_digest)=64 AND signature_digest NOT GLOB '*[^0-9a-f]*'),
 delivery_attempt INTEGER NOT NULL CHECK(delivery_attempt BETWEEN 1 AND 1000),
 external_user_reference_digest TEXT CHECK(external_user_reference_digest IS NULL OR length(external_user_reference_digest) BETWEEN 67 AND 100),
 conversation_reference_digest TEXT CHECK(conversation_reference_digest IS NULL OR length(conversation_reference_digest)=64),
 metadata_version INTEGER NOT NULL CHECK(metadata_version BETWEEN 1 AND 1000),
 payload_size INTEGER NOT NULL CHECK(payload_size BETWEEN 2 AND 16384),
 created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(tenant_id,id), UNIQUE(channel_account_key,external_event_id),
 FOREIGN KEY(tenant_id,application_id,channel_account_key) REFERENCES channel_accounts(tenant_id,application_id,channel_account_key) ON DELETE RESTRICT
);

CREATE TABLE channel_delivery_records (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, channel_account_key TEXT NOT NULL,
 inbound_event_id TEXT NOT NULL, external_event_id TEXT NOT NULL,
 payload_digest TEXT NOT NULL CHECK(length(payload_digest)=64 AND payload_digest NOT GLOB '*[^0-9a-f]*'),
 status TEXT NOT NULL CHECK(status IN ('received','processing','completed','rejected','failed','expired')),
 lease_owner TEXT, fencing_token INTEGER NOT NULL CHECK(fencing_token BETWEEN 1 AND 1000000000),
 lease_expires_at INTEGER, first_received_at INTEGER NOT NULL CHECK(first_received_at>=0),
 last_received_at INTEGER NOT NULL CHECK(last_received_at>=first_received_at),
 attempt_count INTEGER NOT NULL CHECK(attempt_count BETWEEN 1 AND 1000000000),
 completed_at INTEGER, result_digest TEXT CHECK(result_digest IS NULL OR length(result_digest)=64),
 safe_result_json TEXT CHECK(safe_result_json IS NULL OR (json_valid(safe_result_json) AND json_type(safe_result_json)='object' AND length(safe_result_json)<=2048)),
 failure_code TEXT CHECK(failure_code IS NULL OR length(failure_code) BETWEEN 3 AND 80),
 version INTEGER NOT NULL CHECK(version BETWEEN 1 AND 1000000000),
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,id), UNIQUE(channel_account_key,external_event_id), UNIQUE(inbound_event_id),
 FOREIGN KEY(tenant_id,application_id,channel_account_key) REFERENCES channel_accounts(tenant_id,application_id,channel_account_key) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,inbound_event_id) REFERENCES channel_inbound_events(tenant_id,id) ON DELETE RESTRICT,
 CHECK((status='processing' AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL AND completed_at IS NULL AND result_digest IS NULL) OR
       (status IN ('completed','rejected') AND lease_owner IS NULL AND lease_expires_at IS NULL AND completed_at IS NOT NULL AND result_digest IS NOT NULL AND safe_result_json IS NOT NULL) OR
       (status IN ('received','failed','expired') AND lease_owner IS NULL AND lease_expires_at IS NULL))
);

CREATE TABLE channel_delivery_evidence (
 delivery_id TEXT PRIMARY KEY CHECK(length(delivery_id)=36 AND substr(delivery_id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, channel_type TEXT NOT NULL,
 channel_account_key TEXT NOT NULL, external_event_id TEXT NOT NULL, inbound_event_type TEXT NOT NULL,
 delivery_record_id TEXT NOT NULL UNIQUE, fencing_token INTEGER NOT NULL,
 identity_resolution_outcome TEXT NOT NULL CHECK(identity_resolution_outcome IN ('linked','not_linked','suspended','revoked','mismatch','not_required')),
 workbench_outcome TEXT NOT NULL CHECK(length(workbench_outcome) BETWEEN 2 AND 80),
 response_type TEXT NOT NULL CHECK(response_type IN ('text','confirmation','cards','error','unsupported','no_reply')),
 delivery_outcome TEXT NOT NULL CHECK(delivery_outcome IN ('completed','rejected','failed')),
 attempt_count INTEGER NOT NULL CHECK(attempt_count BETWEEN 1 AND 1000000000),
 latency_ms INTEGER NOT NULL CHECK(latency_ms BETWEEN 0 AND 300000),
 support_code TEXT NOT NULL UNIQUE CHECK(length(support_code) BETWEEN 8 AND 40), created_at INTEGER NOT NULL CHECK(created_at>=0),
 FOREIGN KEY(tenant_id,application_id,channel_account_key) REFERENCES channel_accounts(tenant_id,application_id,channel_account_key) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,delivery_record_id) REFERENCES channel_delivery_records(tenant_id,id) ON DELETE RESTRICT
);

CREATE TABLE channel_response_policies (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, channel_account_key TEXT NOT NULL,
 policy_version INTEGER NOT NULL CHECK(policy_version BETWEEN 1 AND 1000000),
 max_text_length INTEGER NOT NULL CHECK(max_text_length BETWEEN 1 AND 10000),
 max_messages INTEGER NOT NULL CHECK(max_messages BETWEEN 1 AND 10),
 supports_buttons INTEGER NOT NULL CHECK(supports_buttons IN (0,1)), supports_cards INTEGER NOT NULL CHECK(supports_cards IN (0,1)),
 locale_allowlist_json TEXT NOT NULL CHECK(json_valid(locale_allowlist_json) AND json_type(locale_allowlist_json)='array' AND json_array_length(locale_allowlist_json) BETWEEN 1 AND 20 AND length(locale_allowlist_json)<=512),
 status TEXT NOT NULL CHECK(status IN ('active','retired')), created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(channel_account_key,policy_version),
 FOREIGN KEY(tenant_id,application_id,channel_account_key) REFERENCES channel_accounts(tenant_id,application_id,channel_account_key) ON DELETE RESTRICT
);

CREATE INDEX idx_channel_catalog_type_status ON channel_catalog(channel_type,status,adapter_key);
CREATE INDEX idx_channel_accounts_tenant_app_status ON channel_accounts(tenant_id,application_id,status,channel_account_key);
CREATE INDEX idx_channel_accounts_adapter_status ON channel_accounts(adapter_key,status,channel_account_key);
CREATE INDEX idx_channel_identity_digest ON channel_identity_links(channel_account_key,external_user_reference_digest,status);
CREATE INDEX idx_channel_identity_tenant_member ON channel_identity_links(tenant_id,membership_id,status);
CREATE INDEX idx_channel_event_dedup ON channel_inbound_events(channel_account_key,external_event_id,payload_digest);
CREATE INDEX idx_channel_events_tenant_time ON channel_inbound_events(tenant_id,received_at DESC,id DESC);
CREATE INDEX idx_channel_delivery_processing_lease ON channel_delivery_records(status,lease_expires_at,channel_account_key);
CREATE INDEX idx_channel_delivery_tenant_time ON channel_delivery_records(tenant_id,last_received_at DESC,id DESC);
CREATE INDEX idx_channel_evidence_tenant_date ON channel_delivery_evidence(tenant_id,created_at DESC,delivery_id DESC);
CREATE INDEX idx_channel_evidence_support_code ON channel_delivery_evidence(support_code,tenant_id);
CREATE INDEX idx_channel_response_policy_active ON channel_response_policies(channel_account_key,status,policy_version DESC);

CREATE TRIGGER trg_channel_catalog_no_update BEFORE UPDATE ON channel_catalog BEGIN SELECT RAISE(ABORT,'channel_catalog_immutable'); END;
CREATE TRIGGER trg_channel_catalog_no_delete BEFORE DELETE ON channel_catalog BEGIN SELECT RAISE(ABORT,'channel_catalog_immutable'); END;
CREATE TRIGGER trg_channel_account_version_guard BEFORE UPDATE ON channel_accounts FOR EACH ROW WHEN NEW.version<>OLD.version+1 OR NEW.tenant_id<>OLD.tenant_id OR NEW.application_id<>OLD.application_id OR NEW.adapter_key<>OLD.adapter_key OR NEW.channel_type<>OLD.channel_type BEGIN SELECT RAISE(ABORT,'channel_account_version_conflict'); END;
CREATE TRIGGER trg_channel_account_terminal_guard BEFORE UPDATE ON channel_accounts FOR EACH ROW WHEN OLD.status='revoked' AND NEW.status<>'revoked' BEGIN SELECT RAISE(ABORT,'channel_account_revoked_terminal'); END;
CREATE TRIGGER trg_channel_account_no_delete BEFORE DELETE ON channel_accounts BEGIN SELECT RAISE(ABORT,'channel_account_no_delete'); END;
CREATE TRIGGER trg_channel_identity_insert_guard BEFORE INSERT ON channel_identity_links FOR EACH ROW WHEN
 NEW.channel_type<>(SELECT channel_type FROM channel_accounts WHERE tenant_id=NEW.tenant_id AND application_id=NEW.application_id AND channel_account_key=NEW.channel_account_key)
 OR NOT EXISTS (SELECT 1 FROM identity_mappings i JOIN tenant_memberships m ON m.tenant_id=NEW.tenant_id AND m.id=NEW.membership_id AND m.platform_user_id=i.platform_user_id WHERE i.id=NEW.identity_id)
BEGIN SELECT RAISE(ABORT,'channel_identity_scope_mismatch'); END;
CREATE TRIGGER trg_channel_identity_version_guard BEFORE UPDATE ON channel_identity_links FOR EACH ROW WHEN NEW.version<>OLD.version+1 OR NEW.tenant_id<>OLD.tenant_id OR NEW.application_id<>OLD.application_id OR NEW.channel_account_key<>OLD.channel_account_key OR NEW.external_user_reference_digest<>OLD.external_user_reference_digest OR NEW.identity_id<>OLD.identity_id OR NEW.membership_id<>OLD.membership_id BEGIN SELECT RAISE(ABORT,'channel_identity_version_conflict'); END;
CREATE TRIGGER trg_channel_identity_terminal_guard BEFORE UPDATE ON channel_identity_links FOR EACH ROW WHEN OLD.status='revoked' AND NEW.status<>'revoked' BEGIN SELECT RAISE(ABORT,'channel_identity_revoked_terminal'); END;
CREATE TRIGGER trg_channel_identity_no_delete BEFORE DELETE ON channel_identity_links BEGIN SELECT RAISE(ABORT,'channel_identity_no_delete'); END;
CREATE TRIGGER trg_channel_inbound_no_update BEFORE UPDATE ON channel_inbound_events BEGIN SELECT RAISE(ABORT,'channel_inbound_immutable'); END;
CREATE TRIGGER trg_channel_inbound_no_delete BEFORE DELETE ON channel_inbound_events BEGIN SELECT RAISE(ABORT,'channel_inbound_immutable'); END;
CREATE TRIGGER trg_channel_delivery_update_guard BEFORE UPDATE ON channel_delivery_records FOR EACH ROW WHEN
 NEW.tenant_id<>OLD.tenant_id OR NEW.application_id<>OLD.application_id OR NEW.channel_account_key<>OLD.channel_account_key OR NEW.external_event_id<>OLD.external_event_id OR NEW.payload_digest<>OLD.payload_digest OR NEW.inbound_event_id<>OLD.inbound_event_id OR
 (OLD.status IN ('completed','rejected','expired') AND (NEW.status<>OLD.status OR NEW.safe_result_json<>OLD.safe_result_json OR NEW.result_digest<>OLD.result_digest)) OR
 NEW.fencing_token<OLD.fencing_token OR NEW.version<>OLD.version+1
BEGIN SELECT RAISE(ABORT,'channel_delivery_transition_invalid'); END;
CREATE TRIGGER trg_channel_delivery_no_delete BEFORE DELETE ON channel_delivery_records BEGIN SELECT RAISE(ABORT,'channel_delivery_no_delete'); END;
CREATE TRIGGER trg_channel_evidence_guard BEFORE INSERT ON channel_delivery_evidence FOR EACH ROW WHEN NOT EXISTS (
 SELECT 1 FROM channel_delivery_records r WHERE r.tenant_id=NEW.tenant_id AND r.application_id=NEW.application_id AND r.channel_account_key=NEW.channel_account_key AND r.id=NEW.delivery_record_id AND r.external_event_id=NEW.external_event_id AND r.fencing_token=NEW.fencing_token AND r.status IN ('completed','rejected')
) BEGIN SELECT RAISE(ABORT,'channel_delivery_evidence_fence_mismatch'); END;
CREATE TRIGGER trg_channel_evidence_no_update BEFORE UPDATE ON channel_delivery_evidence BEGIN SELECT RAISE(ABORT,'channel_delivery_evidence_immutable'); END;
CREATE TRIGGER trg_channel_evidence_no_delete BEFORE DELETE ON channel_delivery_evidence BEGIN SELECT RAISE(ABORT,'channel_delivery_evidence_immutable'); END;
CREATE TRIGGER trg_channel_response_policy_no_update BEFORE UPDATE ON channel_response_policies BEGIN SELECT RAISE(ABORT,'channel_response_policy_immutable'); END;
CREATE TRIGGER trg_channel_response_policy_no_delete BEFORE DELETE ON channel_response_policies BEGIN SELECT RAISE(ABORT,'channel_response_policy_immutable'); END;
