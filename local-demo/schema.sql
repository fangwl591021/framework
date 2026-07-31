CREATE TABLE IF NOT EXISTS local_demo_state (state_key TEXT PRIMARY KEY,state_json TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS local_demo_sessions (
  token_digest TEXT PRIMARY KEY, csrf_digest TEXT NOT NULL UNIQUE,
  fixture_key TEXT NOT NULL CHECK (fixture_key IN ('owner_a','owner_b','member_a','operator_a')),
  channel_version INTEGER NOT NULL DEFAULT 1 CHECK (channel_version > 0),
  expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_local_demo_sessions_expiry ON local_demo_sessions(expires_at);
