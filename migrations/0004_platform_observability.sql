PRAGMA foreign_keys = ON;

-- Platform Service permissions are installed only by this reviewed migration.
DROP TRIGGER trg_permissions_immutable_insert;
INSERT INTO permissions (id, permission_key, description, status, created_at, updated_at) VALUES
  ('019b0000-0000-7000-8000-000000000101', 'diagnostics:read_tenant', 'Read tenant diagnostics', 'active', 1785542400000, 1785542400000),
  ('019b0000-0000-7000-8000-000000000102', 'diagnostics:read_platform', 'Read platform diagnostics', 'active', 1785542400000, 1785542400000),
  ('019b0000-0000-7000-8000-000000000103', 'incident:read', 'Read incidents', 'active', 1785542400000, 1785542400000),
  ('019b0000-0000-7000-8000-000000000104', 'incident:manage', 'Manage incident lifecycle', 'active', 1785542400000, 1785542400000),
  ('019b0000-0000-7000-8000-000000000105', 'alert:read', 'Read alert delivery evidence', 'active', 1785542400000, 1785542400000),
  ('019b0000-0000-7000-8000-000000000106', 'alert:manage', 'Manage alert policy lifecycle', 'active', 1785542400000, 1785542400000);
CREATE TRIGGER trg_permissions_immutable_insert
BEFORE INSERT ON permissions FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'permission_vocabulary_immutable');
END;

CREATE TABLE observation_events (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  correlation_id TEXT NOT NULL CHECK (length(correlation_id) BETWEEN 8 AND 255),
  trace_id TEXT NOT NULL CHECK (length(trace_id) BETWEEN 8 AND 255),
  observed_at INTEGER NOT NULL CHECK (observed_at >= 0),
  environment TEXT NOT NULL CHECK (environment IN ('development','staging','production')),
  release_id TEXT NOT NULL CHECK (length(release_id) BETWEEN 1 AND 80),
  tenant_id TEXT,
  application_id TEXT CHECK (application_id IS NULL OR length(application_id) BETWEEN 1 AND 80),
  module_key TEXT NOT NULL CHECK (length(module_key) BETWEEN 1 AND 80),
  operation TEXT NOT NULL CHECK (length(operation) BETWEEN 1 AND 100),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'request.received','request.completed','request.failed',
    'dependency.degraded','dependency.unavailable','backup.failed',
    'restore.failed','release.unhealthy','webhook.failed',
    'background_job.failed','data_validation.failed','permission.denied',
    'configuration.invalid'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  status TEXT NOT NULL CHECK (status IN ('accepted','processing','succeeded','failed','action_required')),
  reason_code TEXT NOT NULL CHECK (length(reason_code) BETWEEN 1 AND 80),
  safe_message TEXT NOT NULL CHECK (length(safe_message) BETWEEN 1 AND 500),
  dependency_key TEXT CHECK (dependency_key IS NULL OR length(dependency_key) BETWEEN 1 AND 80),
  actor_reference_digest TEXT CHECK (
    actor_reference_digest IS NULL OR
    (length(actor_reference_digest) = 71 AND substr(actor_reference_digest, 1, 7) = 'digest:'
    AND substr(actor_reference_digest, 8) NOT GLOB '*[^0-9a-f]*')
  ),
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count BETWEEN 1 AND 1000000000),
  first_seen_at INTEGER NOT NULL CHECK (first_seen_at >= 0),
  last_seen_at INTEGER NOT NULL CHECK (last_seen_at >= first_seen_at),
  metadata_safe_json TEXT NOT NULL DEFAULT '{}' CHECK (
    length(metadata_safe_json) <= 2048 AND json_valid(metadata_safe_json)
    AND json_type(metadata_safe_json) = 'object'
  ),
  retention_expires_at INTEGER NOT NULL CHECK (retention_expires_at >= observed_at),
  retention_status TEXT NOT NULL DEFAULT 'active' CHECK (retention_status IN ('active','anonymized')),
  anonymized_at INTEGER,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (tenant_id IS NOT NULL OR application_id IS NULL)
);

CREATE TABLE incidents (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform','tenant','provider')),
  tenant_id TEXT,
  aggregation_scope_key TEXT NOT NULL CHECK (length(aggregation_scope_key) BETWEEN 8 AND 100),
  fingerprint TEXT NOT NULL CHECK (length(fingerprint) = 64 AND fingerprint NOT GLOB '*[^0-9a-f]*'),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  severity TEXT NOT NULL CHECK (severity IN ('warning','error','critical')),
  status TEXT NOT NULL CHECK (status IN ('open','acknowledged','investigating','mitigated','resolved')),
  first_seen_at INTEGER NOT NULL CHECK (first_seen_at >= 0),
  last_seen_at INTEGER NOT NULL CHECK (last_seen_at >= first_seen_at),
  occurrence_count INTEGER NOT NULL CHECK (occurrence_count BETWEEN 1 AND 1000000000),
  affected_tenant_count INTEGER NOT NULL CHECK (affected_tenant_count BETWEEN 0 AND 1000000000),
  affected_application_count INTEGER NOT NULL CHECK (affected_application_count BETWEEN 0 AND 1000000000),
  dependency_key TEXT CHECK (dependency_key IS NULL OR length(dependency_key) BETWEEN 1 AND 80),
  release_id TEXT NOT NULL CHECK (length(release_id) BETWEEN 1 AND 80),
  owner_reference TEXT CHECK (owner_reference IS NULL OR length(owner_reference) BETWEEN 1 AND 128),
  resolution_code TEXT CHECK (resolution_code IS NULL OR length(resolution_code) BETWEEN 1 AND 80),
  resolved_at INTEGER,
  reopen_count INTEGER NOT NULL DEFAULT 0 CHECK (reopen_count >= 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (aggregation_scope_key, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (scope_type = 'tenant' AND tenant_id IS NOT NULL AND aggregation_scope_key = 'tenant:' || tenant_id)
    OR (scope_type = 'provider' AND tenant_id IS NULL AND dependency_key IS NOT NULL
      AND aggregation_scope_key = 'provider:' || dependency_key)
    OR (scope_type = 'platform' AND tenant_id IS NULL AND aggregation_scope_key = 'platform')
  ),
  CHECK (
    (status = 'resolved' AND resolution_code IS NOT NULL AND resolved_at IS NOT NULL)
    OR (status <> 'resolved' AND resolution_code IS NULL AND resolved_at IS NULL)
  )
);

CREATE TABLE incident_events (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  incident_id TEXT NOT NULL,
  observation_event_id TEXT,
  event_kind TEXT NOT NULL CHECK (event_kind IN (
    'observed','reopened','acknowledged','investigating','mitigated','resolved'
  )),
  actor_reference_digest TEXT CHECK (
    actor_reference_digest IS NULL OR
    (length(actor_reference_digest) = 71 AND substr(actor_reference_digest, 1, 7) = 'digest:'
    AND substr(actor_reference_digest, 8) NOT GLOB '*[^0-9a-f]*')
  ),
  reason_code TEXT NOT NULL CHECK (length(reason_code) BETWEEN 1 AND 80),
  occurred_at INTEGER NOT NULL CHECK (occurred_at >= 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE RESTRICT,
  FOREIGN KEY (observation_event_id) REFERENCES observation_events(id) ON DELETE RESTRICT,
  UNIQUE (incident_id, observation_event_id, event_kind)
);

CREATE TABLE alert_policies (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform','tenant')),
  tenant_id TEXT,
  policy_key TEXT NOT NULL CHECK (length(policy_key) BETWEEN 3 AND 80),
  minimum_severity TEXT NOT NULL CHECK (minimum_severity IN ('warning','error','critical')),
  event_category TEXT CHECK (event_category IS NULL OR length(event_category) BETWEEN 1 AND 80),
  environment TEXT CHECK (environment IS NULL OR environment IN ('development','staging','production')),
  module_key TEXT CHECK (module_key IS NULL OR length(module_key) BETWEEN 1 AND 80),
  dependency_key TEXT CHECK (dependency_key IS NULL OR length(dependency_key) BETWEEN 1 AND 80),
  aggregation_window_ms INTEGER NOT NULL CHECK (aggregation_window_ms BETWEEN 1000 AND 86400000),
  occurrence_threshold INTEGER NOT NULL CHECK (occurrence_threshold BETWEEN 1 AND 1000000),
  cooldown_ms INTEGER NOT NULL CHECK (cooldown_ms BETWEEN 1000 AND 604800000),
  escalation_delay_ms INTEGER NOT NULL CHECK (escalation_delay_ms BETWEEN 0 AND 604800000),
  enabled INTEGER NOT NULL CHECK (enabled IN (0,1)),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (scope_type = 'platform' AND tenant_id IS NULL)
    OR (scope_type = 'tenant' AND tenant_id IS NOT NULL)
  ),
  UNIQUE (scope_type, tenant_id, policy_key)
);

CREATE TABLE alert_delivery_records (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  incident_id TEXT NOT NULL,
  alert_policy_id TEXT,
  delivery_key TEXT NOT NULL CHECK (length(delivery_key) = 64 AND delivery_key NOT GLOB '*[^0-9a-f]*'),
  provider_key TEXT NOT NULL CHECK (provider_key IN ('local_capture','telegram')),
  severity TEXT NOT NULL CHECK (severity IN ('warning','error','critical')),
  status TEXT NOT NULL CHECK (status IN ('pending','delivered','failed','retry_scheduled','suppressed')),
  attempt_count INTEGER NOT NULL CHECK (attempt_count BETWEEN 0 AND 100),
  next_retry_at INTEGER,
  safe_payload_json TEXT NOT NULL CHECK (
    length(safe_payload_json) <= 2048 AND json_valid(safe_payload_json)
    AND json_type(safe_payload_json) = 'object'
  ),
  failure_reason_code TEXT CHECK (failure_reason_code IS NULL OR length(failure_reason_code) BETWEEN 1 AND 80),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  delivered_at INTEGER,
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE RESTRICT,
  FOREIGN KEY (alert_policy_id) REFERENCES alert_policies(id) ON DELETE RESTRICT,
  CHECK (
    (status = 'delivered' AND delivered_at IS NOT NULL AND failure_reason_code IS NULL)
    OR (status IN ('failed','retry_scheduled') AND delivered_at IS NULL AND failure_reason_code IS NOT NULL)
    OR (status IN ('pending','suppressed') AND delivered_at IS NULL AND failure_reason_code IS NULL)
  )
);

CREATE TABLE support_code_mappings (
  support_code TEXT PRIMARY KEY CHECK (
    length(support_code) = 14 AND substr(support_code, 1, 4) = 'SUP-'
    AND substr(support_code, 5) NOT GLOB '*[^0-9A-F]*'
  ),
  correlation_id TEXT CHECK (correlation_id IS NULL OR length(correlation_id) BETWEEN 8 AND 255),
  trace_id TEXT CHECK (trace_id IS NULL OR length(trace_id) BETWEEN 8 AND 255),
  tenant_id TEXT,
  observation_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired')),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  expired_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (observation_event_id) REFERENCES observation_events(id) ON DELETE RESTRICT,
  CHECK (
    (status = 'active' AND correlation_id IS NOT NULL AND trace_id IS NOT NULL
      AND observation_event_id IS NOT NULL AND expired_at IS NULL)
    OR (status = 'expired' AND correlation_id IS NULL AND trace_id IS NULL
      AND observation_event_id IS NULL AND expired_at IS NOT NULL
      AND expired_at >= expires_at)
  )
);

CREATE INDEX idx_observation_environment_severity_time
  ON observation_events(environment, severity, observed_at DESC, id);
CREATE INDEX idx_observation_tenant_time
  ON observation_events(tenant_id, observed_at DESC, id);
CREATE INDEX idx_observation_reason_time
  ON observation_events(reason_code, dependency_key, observed_at DESC, id);
CREATE INDEX idx_observation_retention
  ON observation_events(retention_status, retention_expires_at, tenant_id, id);
CREATE UNIQUE INDEX uq_incident_scope_fingerprint
  ON incidents(aggregation_scope_key, fingerprint);
CREATE INDEX idx_incident_status_severity
  ON incidents(status, severity, last_seen_at DESC, id);
CREATE INDEX idx_incident_tenant_time
  ON incidents(tenant_id, last_seen_at DESC, id);
CREATE INDEX idx_incident_events_incident_time
  ON incident_events(incident_id, occurred_at DESC, id);
CREATE INDEX idx_incident_events_observation
  ON incident_events(observation_event_id, incident_id);
CREATE INDEX idx_alert_policy_selection
  ON alert_policies(enabled, scope_type, tenant_id, minimum_severity, environment);
CREATE UNIQUE INDEX uq_alert_delivery_key
  ON alert_delivery_records(delivery_key);
CREATE INDEX idx_alert_delivery_incident_time
  ON alert_delivery_records(incident_id, created_at DESC, id);
CREATE INDEX idx_alert_delivery_retry
  ON alert_delivery_records(status, next_retry_at, id);
CREATE INDEX idx_support_code_tenant_expiry
  ON support_code_mappings(tenant_id, status, expires_at, support_code);
CREATE INDEX idx_support_code_expiry
  ON support_code_mappings(status, expires_at, support_code);

CREATE TRIGGER trg_observation_no_delete
BEFORE DELETE ON observation_events
BEGIN SELECT RAISE(ABORT, 'observation_event_immutable'); END;

CREATE TRIGGER trg_observation_update_guard
BEFORE UPDATE ON observation_events
FOR EACH ROW WHEN OLD.retention_status = NEW.retention_status AND (
  NEW.id IS NOT OLD.id OR NEW.correlation_id IS NOT OLD.correlation_id
  OR NEW.trace_id IS NOT OLD.trace_id OR NEW.observed_at IS NOT OLD.observed_at
  OR NEW.environment IS NOT OLD.environment OR NEW.release_id IS NOT OLD.release_id
  OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id
  OR NEW.module_key IS NOT OLD.module_key OR NEW.operation IS NOT OLD.operation
  OR NEW.event_type IS NOT OLD.event_type OR NEW.severity IS NOT OLD.severity
  OR NEW.status IS NOT OLD.status OR NEW.reason_code IS NOT OLD.reason_code
  OR NEW.safe_message IS NOT OLD.safe_message OR NEW.dependency_key IS NOT OLD.dependency_key
  OR NEW.actor_reference_digest IS NOT OLD.actor_reference_digest
  OR NEW.first_seen_at IS NOT OLD.first_seen_at OR NEW.metadata_safe_json IS NOT OLD.metadata_safe_json
  OR NEW.retention_expires_at IS NOT OLD.retention_expires_at
  OR NEW.anonymized_at IS NOT OLD.anonymized_at OR NEW.created_at IS NOT OLD.created_at
  OR NEW.occurrence_count < OLD.occurrence_count OR NEW.last_seen_at < OLD.last_seen_at
)
BEGIN SELECT RAISE(ABORT, 'observation_event_immutable'); END;

CREATE TRIGGER trg_observation_anonymize_guard
BEFORE UPDATE ON observation_events
FOR EACH ROW WHEN OLD.retention_status = 'active' AND NEW.retention_status = 'anonymized' AND NOT (
  NEW.id IS OLD.id AND NEW.correlation_id = 'retained' AND NEW.trace_id = 'retained'
  AND NEW.observed_at IS OLD.observed_at AND NEW.environment IS OLD.environment
  AND NEW.release_id IS OLD.release_id AND NEW.tenant_id IS OLD.tenant_id
  AND NEW.application_id IS OLD.application_id AND NEW.module_key IS OLD.module_key
  AND NEW.operation IS OLD.operation AND NEW.event_type IS OLD.event_type
  AND NEW.severity IS OLD.severity AND NEW.status IS OLD.status
  AND NEW.reason_code IS OLD.reason_code AND NEW.safe_message = 'Historical observation retained.'
  AND NEW.dependency_key IS OLD.dependency_key AND NEW.actor_reference_digest IS NULL
  AND NEW.occurrence_count IS OLD.occurrence_count AND NEW.first_seen_at IS OLD.first_seen_at
  AND NEW.last_seen_at IS OLD.last_seen_at AND NEW.metadata_safe_json = '{}'
  AND NEW.retention_expires_at IS OLD.retention_expires_at
  AND NEW.anonymized_at >= OLD.retention_expires_at AND NEW.created_at IS OLD.created_at
)
BEGIN SELECT RAISE(ABORT, 'observation_retention_transition_invalid'); END;

CREATE TRIGGER trg_observation_retention_transition_guard
BEFORE UPDATE OF retention_status ON observation_events
FOR EACH ROW WHEN NEW.retention_status <> OLD.retention_status AND NOT (
  OLD.retention_status = 'active' AND NEW.retention_status = 'anonymized'
)
BEGIN SELECT RAISE(ABORT, 'observation_retention_transition_invalid'); END;
CREATE TRIGGER trg_incident_no_delete
BEFORE DELETE ON incidents
BEGIN SELECT RAISE(ABORT, 'incident_history_immutable'); END;

CREATE TRIGGER trg_incident_identity_guard
BEFORE UPDATE ON incidents
FOR EACH ROW WHEN
  NEW.id IS NOT OLD.id OR NEW.scope_type IS NOT OLD.scope_type
  OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.aggregation_scope_key IS NOT OLD.aggregation_scope_key
  OR NEW.fingerprint IS NOT OLD.fingerprint OR NEW.first_seen_at IS NOT OLD.first_seen_at
  OR NEW.created_at IS NOT OLD.created_at OR NEW.occurrence_count < OLD.occurrence_count
  OR NEW.affected_tenant_count < OLD.affected_tenant_count
  OR NEW.affected_application_count < OLD.affected_application_count
  OR NEW.reopen_count < OLD.reopen_count OR NEW.last_seen_at < OLD.last_seen_at
BEGIN SELECT RAISE(ABORT, 'incident_identity_immutable'); END;

CREATE TRIGGER trg_incident_lifecycle_guard
BEFORE UPDATE OF status ON incidents
FOR EACH ROW WHEN NEW.status <> OLD.status AND NOT (
  (OLD.status = 'open' AND NEW.status IN ('acknowledged','investigating','mitigated','resolved'))
  OR (OLD.status = 'acknowledged' AND NEW.status IN ('investigating','mitigated','resolved'))
  OR (OLD.status = 'investigating' AND NEW.status IN ('mitigated','resolved'))
  OR (OLD.status = 'mitigated' AND NEW.status = 'resolved')
  OR (OLD.status = 'resolved' AND NEW.status = 'open')
)
BEGIN SELECT RAISE(ABORT, 'incident_lifecycle_invalid'); END;

CREATE TRIGGER trg_incident_events_no_update
BEFORE UPDATE ON incident_events
BEGIN SELECT RAISE(ABORT, 'incident_event_immutable'); END;
CREATE TRIGGER trg_incident_events_no_delete
BEFORE DELETE ON incident_events
BEGIN SELECT RAISE(ABORT, 'incident_event_immutable'); END;

CREATE TRIGGER trg_alert_policy_no_delete
BEFORE DELETE ON alert_policies
BEGIN SELECT RAISE(ABORT, 'alert_policy_history_required'); END;

CREATE TRIGGER trg_alert_delivery_no_delete
BEFORE DELETE ON alert_delivery_records
BEGIN SELECT RAISE(ABORT, 'alert_delivery_history_immutable'); END;
CREATE TRIGGER trg_alert_delivery_attempt_guard
BEFORE UPDATE ON alert_delivery_records
FOR EACH ROW WHEN
  NEW.id IS NOT OLD.id OR NEW.incident_id IS NOT OLD.incident_id
  OR NEW.alert_policy_id IS NOT OLD.alert_policy_id OR NEW.delivery_key IS NOT OLD.delivery_key
  OR NEW.provider_key IS NOT OLD.provider_key OR NEW.severity IS NOT OLD.severity
  OR NEW.safe_payload_json IS NOT OLD.safe_payload_json OR NEW.created_at IS NOT OLD.created_at
  OR NEW.attempt_count < OLD.attempt_count
BEGIN SELECT RAISE(ABORT, 'alert_delivery_identity_immutable'); END;

CREATE TRIGGER trg_alert_delivery_lifecycle_guard
BEFORE UPDATE OF status ON alert_delivery_records
FOR EACH ROW WHEN NEW.status <> OLD.status AND NOT (
  (OLD.status = 'pending' AND NEW.status IN ('delivered','failed','retry_scheduled','suppressed'))
  OR (OLD.status IN ('failed','retry_scheduled') AND NEW.status IN ('delivered','failed','retry_scheduled'))
)
BEGIN SELECT RAISE(ABORT, 'alert_delivery_lifecycle_invalid'); END;

CREATE TRIGGER trg_support_code_no_update
BEFORE UPDATE ON support_code_mappings
FOR EACH ROW WHEN NOT (
  OLD.status = 'active' AND NEW.status = 'expired'
  AND NEW.support_code IS OLD.support_code AND NEW.tenant_id IS OLD.tenant_id
  AND NEW.correlation_id IS NULL AND NEW.trace_id IS NULL
  AND NEW.observation_event_id IS NULL AND NEW.created_at IS OLD.created_at
  AND NEW.expires_at IS OLD.expires_at AND NEW.expired_at >= OLD.expires_at
)
BEGIN SELECT RAISE(ABORT, 'support_code_mapping_immutable'); END;

CREATE TRIGGER trg_support_code_no_delete
BEFORE DELETE ON support_code_mappings
BEGIN SELECT RAISE(ABORT, 'support_code_mapping_immutable'); END;
