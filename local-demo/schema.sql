CREATE TABLE IF NOT EXISTS local_demo_state (state_key TEXT PRIMARY KEY,state_json TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS local_demo_sessions (
  token_digest TEXT PRIMARY KEY, csrf_digest TEXT NOT NULL UNIQUE,
  fixture_key TEXT NOT NULL CHECK (fixture_key IN ('owner_a','owner_b','owner_tenant_b','member_a','operator_a')),
  channel_version INTEGER NOT NULL DEFAULT 1 CHECK (channel_version > 0),
  expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_local_demo_sessions_expiry ON local_demo_sessions(expires_at);

CREATE TABLE IF NOT EXISTS local_ai_lab_evidence (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  actor_fixture TEXT NOT NULL,
  task_key TEXT NOT NULL,
  scenario_key TEXT NOT NULL,
  input_digest TEXT NOT NULL CHECK(length(input_digest) = 64),
  idempotency_digest TEXT NOT NULL CHECK(length(idempotency_digest) = 64),
  status TEXT NOT NULL CHECK(status IN ('completed','rejected','failed','fallback','cached')),
  support_code TEXT NOT NULL UNIQUE CHECK(length(support_code) BETWEEN 12 AND 40),
  timeline_json TEXT NOT NULL CHECK(json_valid(timeline_json) AND json_type(timeline_json) = 'array' AND length(timeline_json) <= 4096),
  summary_json TEXT NOT NULL CHECK(json_valid(summary_json) AND json_type(summary_json) = 'object' AND length(summary_json) <= 8192),
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  UNIQUE(tenant_id,application_id,task_key,idempotency_digest),
  FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_local_ai_lab_requests
ON local_ai_lab_evidence(tenant_id,application_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_local_ai_lab_usage
ON local_ai_lab_evidence(tenant_id,status,created_at DESC,id DESC);
