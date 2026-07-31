PRAGMA foreign_keys = ON;

-- Platform Traffic Protection permissions are installed only by this reviewed
-- migration through the Module Permission Registration Gate.
DROP TRIGGER trg_permissions_immutable_insert;
INSERT INTO permissions (id, permission_key, description, status, created_at, updated_at) VALUES
  ('019d0000-0000-7000-8000-000000000201', 'traffic:read_tenant', 'Read tenant traffic evidence', 'active', 1788220800000, 1788220800000),
  ('019d0000-0000-7000-8000-000000000202', 'traffic:read_platform', 'Read platform traffic evidence', 'active', 1788220800000, 1788220800000),
  ('019d0000-0000-7000-8000-000000000203', 'traffic:manage_policy', 'Manage traffic protection policy', 'active', 1788220800000, 1788220800000),
  ('019d0000-0000-7000-8000-000000000204', 'circuit:read', 'Read circuit breaker state', 'active', 1788220800000, 1788220800000),
  ('019d0000-0000-7000-8000-000000000205', 'circuit:manage', 'Manage circuit breaker state', 'active', 1788220800000, 1788220800000),
  ('019d0000-0000-7000-8000-000000000206', 'degradation:read', 'Read degradation state', 'active', 1788220800000, 1788220800000),
  ('019d0000-0000-7000-8000-000000000207', 'degradation:manage', 'Manage degradation state', 'active', 1788220800000, 1788220800000);
CREATE TRIGGER trg_permissions_immutable_insert
BEFORE INSERT ON permissions FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'permission_vocabulary_immutable');
END;

CREATE TABLE webhook_receipts (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  application_scope_key TEXT NOT NULL CHECK (length(application_scope_key) BETWEEN 1 AND 100),
  provider_key TEXT NOT NULL CHECK (length(provider_key) BETWEEN 1 AND 40),
  provider_event_id TEXT NOT NULL CHECK (length(provider_event_id) BETWEEN 1 AND 200),
  issuer_context_digest TEXT NOT NULL CHECK (length(issuer_context_digest)=71 AND substr(issuer_context_digest,1,7)='digest:' AND substr(issuer_context_digest,8) NOT GLOB '*[^0-9a-f]*'),
  normalized_event_type TEXT NOT NULL CHECK (length(normalized_event_type) BETWEEN 1 AND 80),
  payload_fingerprint TEXT NOT NULL CHECK (length(payload_fingerprint)=64 AND payload_fingerprint NOT GLOB '*[^0-9a-f]*'),
  status TEXT NOT NULL CHECK (status IN ('processing','completed','failed_retryable','failed_terminal','expired')),
  safe_result_json TEXT CHECK (safe_result_json IS NULL OR (length(safe_result_json)<=2048 AND json_valid(safe_result_json) AND json_type(safe_result_json)='object')),
  lease_owner_token TEXT CHECK (lease_owner_token IS NULL OR (length(lease_owner_token)=36 AND substr(lease_owner_token,15,1)='7')),
  lease_expires_at INTEGER CHECK (lease_expires_at IS NULL OR lease_expires_at >= 0),
  attempt_count INTEGER NOT NULL CHECK (attempt_count BETWEEN 1 AND 10),
  last_attempt_at INTEGER NOT NULL CHECK (last_attempt_at >= 0),
  safe_failure_code TEXT CHECK (safe_failure_code IS NULL OR length(safe_failure_code) BETWEEN 1 AND 80),
  completed_at INTEGER CHECK (completed_at IS NULL OR completed_at >= last_attempt_at),
  replay_count INTEGER NOT NULL DEFAULT 0 CHECK (replay_count BETWEEN 0 AND 1000000000),
  first_received_at INTEGER NOT NULL CHECK (first_received_at >= 0),
  last_received_at INTEGER NOT NULL CHECK (last_received_at >= first_received_at),
  expires_at INTEGER NOT NULL CHECK (expires_at > first_received_at),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (status='processing' AND safe_result_json IS NULL AND lease_owner_token IS NOT NULL AND lease_expires_at IS NOT NULL AND safe_failure_code IS NULL AND completed_at IS NULL)
    OR (status='completed' AND safe_result_json IS NOT NULL AND lease_owner_token IS NOT NULL AND lease_expires_at IS NULL AND safe_failure_code IS NULL AND completed_at IS NOT NULL)
    OR (status='failed_retryable' AND safe_result_json IS NULL AND lease_owner_token IS NOT NULL AND lease_expires_at IS NOT NULL AND safe_failure_code IS NOT NULL AND completed_at IS NULL)
    OR (status='failed_terminal' AND safe_result_json IS NULL AND lease_owner_token IS NOT NULL AND lease_expires_at IS NULL AND safe_failure_code IS NOT NULL AND completed_at IS NULL)
    OR status='expired'
  )
);

CREATE TABLE rate_limit_evidence (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform','tenant')),
  tenant_id TEXT,
  environment TEXT NOT NULL CHECK (environment IN ('development','staging','production')),
  application_scope_key TEXT NOT NULL CHECK (length(application_scope_key) BETWEEN 1 AND 100),
  module_key TEXT NOT NULL CHECK (length(module_key) BETWEEN 1 AND 80),
  route_key TEXT NOT NULL CHECK (length(route_key) BETWEEN 1 AND 120),
  dimension_key_digest TEXT CHECK (
    dimension_key_digest IS NULL OR (
      length(dimension_key_digest) = 71 AND substr(dimension_key_digest, 1, 7) = 'digest:'
      AND substr(dimension_key_digest, 8) NOT GLOB '*[^0-9a-f]*'
    )
  ),
  decision TEXT NOT NULL CHECK (decision IN ('admitted','throttled','shed')),
  reason_code TEXT NOT NULL CHECK (length(reason_code) BETWEEN 1 AND 80),
  priority_class TEXT NOT NULL CHECK (priority_class IN ('critical','normal','background','optional')),
  window_started_at INTEGER NOT NULL CHECK (window_started_at >= 0),
  occurred_at INTEGER NOT NULL CHECK (occurred_at >= window_started_at),
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count BETWEEN 1 AND 1000000000),
  expires_at INTEGER NOT NULL CHECK (expires_at > occurred_at),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (scope_type = 'platform' AND tenant_id IS NULL)
    OR (scope_type = 'tenant' AND tenant_id IS NOT NULL)
  )
);

CREATE TABLE tenant_resource_snapshots (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  window_started_at INTEGER NOT NULL CHECK (window_started_at >= 0),
  concurrent_requests INTEGER NOT NULL CHECK (concurrent_requests BETWEEN 0 AND 1000000000),
  request_count INTEGER NOT NULL CHECK (request_count BETWEEN 0 AND 1000000000),
  expensive_mutation_count INTEGER NOT NULL CHECK (expensive_mutation_count BETWEEN 0 AND 1000000000),
  background_intent_count INTEGER NOT NULL CHECK (background_intent_count BETWEEN 0 AND 1000000000),
  provider_call_count INTEGER NOT NULL CHECK (provider_call_count BETWEEN 0 AND 1000000000),
  database_write_count INTEGER NOT NULL CHECK (database_write_count BETWEEN 0 AND 1000000000),
  expires_at INTEGER NOT NULL CHECK (expires_at > window_started_at),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE circuit_breaker_states (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('provider','tenant_provider','module','platform')),
  tenant_id TEXT,
  dependency_key TEXT NOT NULL CHECK (length(dependency_key) BETWEEN 1 AND 80),
  scope_key TEXT NOT NULL CHECK (length(scope_key) BETWEEN 3 AND 180),
  state TEXT NOT NULL CHECK (state IN ('closed','open','half_open')),
  consecutive_failure_count INTEGER NOT NULL CHECK (consecutive_failure_count BETWEEN 0 AND 1000000),
  half_open_probe_count INTEGER NOT NULL CHECK (half_open_probe_count BETWEEN 0 AND 1000),
  opened_at INTEGER,
  cooldown_until INTEGER,
  version INTEGER NOT NULL CHECK (version BETWEEN 1 AND 1000000000),
  last_reason_code TEXT NOT NULL CHECK (length(last_reason_code) BETWEEN 1 AND 80),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (scope_type = 'tenant_provider' AND tenant_id IS NOT NULL)
    OR (scope_type <> 'tenant_provider' AND tenant_id IS NULL)
  ),
  CHECK (
    (state = 'closed' AND opened_at IS NULL AND cooldown_until IS NULL)
    OR (state IN ('open','half_open') AND opened_at IS NOT NULL AND cooldown_until IS NOT NULL)
  )
);

CREATE TABLE degradation_states (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform','tenant')),
  tenant_id TEXT,
  scope_key TEXT NOT NULL CHECK (length(scope_key) BETWEEN 3 AND 100),
  mode TEXT NOT NULL CHECK (mode IN (
    'normal','protect_background','protect_optional','protect_writes','emergency'
  )),
  reason_code TEXT NOT NULL CHECK (length(reason_code) BETWEEN 1 AND 80),
  status TEXT NOT NULL CHECK (status IN ('active','recovered')),
  started_at INTEGER NOT NULL CHECK (started_at >= 0),
  recovery_eligible_at INTEGER NOT NULL CHECK (recovery_eligible_at >= started_at),
  recovered_at INTEGER,
  version INTEGER NOT NULL CHECK (version BETWEEN 1 AND 1000000000),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (scope_type = 'platform' AND tenant_id IS NULL AND scope_key = 'platform')
    OR (scope_type = 'tenant' AND tenant_id IS NOT NULL AND scope_key = 'tenant:' || tenant_id)
  ),
  CHECK (
    (status = 'active' AND recovered_at IS NULL)
    OR (status = 'recovered' AND recovered_at IS NOT NULL AND recovered_at >= recovery_eligible_at)
  )
);

CREATE TABLE traffic_policy_records (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform','tenant')),
  tenant_id TEXT,
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'rate_limit','tenant_resource','circuit_breaker','load_shedding'
  )),
  policy_key TEXT NOT NULL CHECK (length(policy_key) BETWEEN 3 AND 80),
  configuration_safe_json TEXT NOT NULL CHECK (
    length(configuration_safe_json) <= 2048 AND json_valid(configuration_safe_json)
    AND json_type(configuration_safe_json) = 'object'
  ),
  status TEXT NOT NULL CHECK (status IN ('active','superseded')),
  effective_at INTEGER NOT NULL CHECK (effective_at >= 0),
  superseded_at INTEGER,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (scope_type = 'platform' AND tenant_id IS NULL)
    OR (scope_type = 'tenant' AND tenant_id IS NOT NULL)
  ),
  CHECK (
    (status = 'active' AND superseded_at IS NULL)
    OR (status = 'superseded' AND superseded_at IS NOT NULL AND superseded_at >= effective_at)
  )
);

CREATE UNIQUE INDEX uq_webhook_event
  ON webhook_receipts(
    tenant_id, application_scope_key, provider_key,
    issuer_context_digest, provider_event_id
  ) WHERE status <> 'expired';
CREATE INDEX idx_webhook_tenant_expiry
  ON webhook_receipts(tenant_id, expires_at, id);
CREATE INDEX idx_webhook_expiry_status
  ON webhook_receipts(status, expires_at, id);
CREATE INDEX idx_webhook_processing_lease
  ON webhook_receipts(status, lease_expires_at, attempt_count, id);
CREATE INDEX idx_webhook_tenant_lease
  ON webhook_receipts(tenant_id, status, lease_expires_at, id);
CREATE INDEX idx_rate_limit_tenant_window
  ON rate_limit_evidence(tenant_id, window_started_at DESC, id);
CREATE INDEX idx_rate_limit_scope_window
  ON rate_limit_evidence(scope_type, environment, route_key, window_started_at DESC, id);
CREATE INDEX idx_rate_limit_expiry
  ON rate_limit_evidence(expires_at, id);
CREATE UNIQUE INDEX uq_tenant_resource_window
  ON tenant_resource_snapshots(tenant_id, window_started_at);
CREATE INDEX idx_tenant_resource_expiry
  ON tenant_resource_snapshots(expires_at, tenant_id, id);
CREATE UNIQUE INDEX uq_circuit_scope
  ON circuit_breaker_states(scope_key);
CREATE INDEX idx_circuit_dependency_state
  ON circuit_breaker_states(dependency_key, state, updated_at DESC, id);
CREATE INDEX idx_circuit_tenant_state
  ON circuit_breaker_states(tenant_id, state, updated_at DESC, id);
CREATE UNIQUE INDEX uq_degradation_active
  ON degradation_states(scope_key) WHERE status = 'active';
CREATE INDEX idx_degradation_scope_time
  ON degradation_states(scope_type, tenant_id, started_at DESC, id);
CREATE UNIQUE INDEX uq_traffic_policy_active
  ON traffic_policy_records(scope_type, COALESCE(tenant_id, 'platform'), policy_type, policy_key)
  WHERE status = 'active';
CREATE INDEX idx_traffic_policy_selection
  ON traffic_policy_records(status, scope_type, tenant_id, policy_type, policy_key);

CREATE TRIGGER trg_webhook_receipt_no_delete
BEFORE DELETE ON webhook_receipts
BEGIN SELECT RAISE(ABORT, 'webhook_receipt_immutable'); END;

CREATE TRIGGER trg_webhook_receipt_update_guard
BEFORE UPDATE ON webhook_receipts
FOR EACH ROW WHEN
  NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id
  OR NEW.application_scope_key IS NOT OLD.application_scope_key
  OR NEW.provider_key IS NOT OLD.provider_key OR NEW.provider_event_id IS NOT OLD.provider_event_id
  OR NEW.issuer_context_digest IS NOT OLD.issuer_context_digest
  OR NEW.normalized_event_type IS NOT OLD.normalized_event_type
  OR NEW.payload_fingerprint IS NOT OLD.payload_fingerprint
  OR NEW.first_received_at IS NOT OLD.first_received_at OR NEW.expires_at IS NOT OLD.expires_at
  OR NEW.created_at IS NOT OLD.created_at OR NEW.replay_count < OLD.replay_count
  OR NEW.last_received_at < OLD.last_received_at OR NEW.updated_at < OLD.updated_at
  OR NOT (
    (NEW.status = OLD.status AND NEW.lease_owner_token IS OLD.lease_owner_token
      AND NEW.lease_expires_at IS OLD.lease_expires_at AND NEW.attempt_count = OLD.attempt_count
      AND NEW.last_attempt_at = OLD.last_attempt_at AND NEW.safe_failure_code IS OLD.safe_failure_code
      AND NEW.safe_result_json IS OLD.safe_result_json AND NEW.completed_at IS OLD.completed_at)
    OR (OLD.status='processing' AND NEW.status='processing'
      AND NEW.attempt_count=OLD.attempt_count+1 AND NEW.lease_owner_token IS NOT OLD.lease_owner_token
      AND NEW.last_attempt_at>=OLD.lease_expires_at AND NEW.lease_expires_at>NEW.last_attempt_at
      AND NEW.safe_failure_code IS NULL AND NEW.safe_result_json IS NULL AND NEW.completed_at IS NULL)
    OR (OLD.status='failed_retryable' AND NEW.status='processing'
      AND NEW.attempt_count=OLD.attempt_count+1 AND NEW.lease_owner_token IS NOT OLD.lease_owner_token
      AND NEW.last_attempt_at>=OLD.lease_expires_at AND NEW.lease_expires_at>NEW.last_attempt_at
      AND NEW.safe_failure_code IS NULL AND NEW.safe_result_json IS NULL AND NEW.completed_at IS NULL)
    OR (OLD.status='processing' AND NEW.status='completed'
      AND NEW.lease_owner_token IS OLD.lease_owner_token AND NEW.attempt_count=OLD.attempt_count
      AND NEW.safe_result_json IS NOT NULL AND NEW.completed_at>=OLD.last_attempt_at)
    OR (OLD.status='processing' AND NEW.status IN ('failed_retryable','failed_terminal')
      AND NEW.lease_owner_token IS OLD.lease_owner_token AND NEW.attempt_count=OLD.attempt_count
      AND NEW.safe_failure_code IS NOT NULL)
    OR (OLD.status='failed_retryable' AND NEW.status='failed_terminal'
      AND NEW.lease_owner_token IS OLD.lease_owner_token AND NEW.attempt_count=OLD.attempt_count)
    OR (OLD.status IN ('completed','failed_terminal') AND NEW.status='expired'
      AND NEW.updated_at>=OLD.expires_at)
  )
BEGIN SELECT RAISE(ABORT, 'webhook_receipt_immutable'); END;
CREATE TRIGGER trg_rate_limit_evidence_no_update
BEFORE UPDATE ON rate_limit_evidence
BEGIN SELECT RAISE(ABORT, 'rate_limit_evidence_immutable'); END;
CREATE TRIGGER trg_rate_limit_evidence_no_delete
BEFORE DELETE ON rate_limit_evidence
BEGIN SELECT RAISE(ABORT, 'rate_limit_evidence_immutable'); END;

CREATE TRIGGER trg_tenant_resource_snapshot_no_update
BEFORE UPDATE ON tenant_resource_snapshots
BEGIN SELECT RAISE(ABORT, 'tenant_resource_snapshot_immutable'); END;
CREATE TRIGGER trg_tenant_resource_snapshot_no_delete
BEFORE DELETE ON tenant_resource_snapshots
BEGIN SELECT RAISE(ABORT, 'tenant_resource_snapshot_immutable'); END;

CREATE TRIGGER trg_circuit_state_no_delete
BEFORE DELETE ON circuit_breaker_states
BEGIN SELECT RAISE(ABORT, 'circuit_state_history_required'); END;
CREATE TRIGGER trg_circuit_state_identity_guard
BEFORE UPDATE ON circuit_breaker_states
FOR EACH ROW WHEN
  NEW.id IS NOT OLD.id OR NEW.scope_type IS NOT OLD.scope_type
  OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.dependency_key IS NOT OLD.dependency_key
  OR NEW.scope_key IS NOT OLD.scope_key OR NEW.created_at IS NOT OLD.created_at
  OR NEW.version <> OLD.version + 1
BEGIN SELECT RAISE(ABORT, 'circuit_state_identity_immutable'); END;
CREATE TRIGGER trg_circuit_state_transition_guard
BEFORE UPDATE OF state ON circuit_breaker_states
FOR EACH ROW WHEN NEW.state <> OLD.state AND NOT (
  (OLD.state = 'closed' AND NEW.state = 'open')
  OR (OLD.state = 'open' AND NEW.state = 'half_open')
  OR (OLD.state = 'half_open' AND NEW.state IN ('closed','open'))
)
BEGIN SELECT RAISE(ABORT, 'circuit_state_transition_invalid'); END;

CREATE TRIGGER trg_degradation_state_no_delete
BEFORE DELETE ON degradation_states
BEGIN SELECT RAISE(ABORT, 'degradation_state_history_required'); END;
CREATE TRIGGER trg_degradation_state_lifecycle_guard
BEFORE UPDATE ON degradation_states
FOR EACH ROW WHEN NOT (
  OLD.status = 'active' AND NEW.status = 'recovered'
  AND NEW.id IS OLD.id AND NEW.scope_type IS OLD.scope_type
  AND NEW.tenant_id IS OLD.tenant_id AND NEW.scope_key IS OLD.scope_key
  AND NEW.mode IS OLD.mode AND NEW.reason_code IS OLD.reason_code
  AND NEW.started_at IS OLD.started_at AND NEW.recovery_eligible_at IS OLD.recovery_eligible_at
  AND NEW.recovered_at >= OLD.recovery_eligible_at AND NEW.version = OLD.version + 1
  AND NEW.created_at IS OLD.created_at AND NEW.updated_at >= OLD.updated_at
)
BEGIN SELECT RAISE(ABORT, 'degradation_state_lifecycle_invalid'); END;

CREATE TRIGGER trg_traffic_policy_no_delete
BEFORE DELETE ON traffic_policy_records
BEGIN SELECT RAISE(ABORT, 'traffic_policy_history_required'); END;
CREATE TRIGGER trg_traffic_policy_lifecycle_guard
BEFORE UPDATE ON traffic_policy_records
FOR EACH ROW WHEN NOT (
  OLD.status = 'active' AND NEW.status = 'superseded'
  AND NEW.id IS OLD.id AND NEW.scope_type IS OLD.scope_type
  AND NEW.tenant_id IS OLD.tenant_id AND NEW.policy_type IS OLD.policy_type
  AND NEW.policy_key IS OLD.policy_key
  AND NEW.configuration_safe_json IS OLD.configuration_safe_json
  AND NEW.effective_at IS OLD.effective_at AND NEW.superseded_at >= OLD.effective_at
  AND NEW.created_at IS OLD.created_at
)
BEGIN SELECT RAISE(ABORT, 'traffic_policy_lifecycle_invalid'); END;
