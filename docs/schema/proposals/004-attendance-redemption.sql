-- PROPOSAL ONLY
-- DO NOT EXECUTE
-- NOT AN APPROVED MIGRATION
-- NOT TESTED AGAINST D1

-- events and event_sessions are minimal Attendance reference envelopes,
-- not a complete Event Module schema.

CREATE TABLE events (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  source_module TEXT NOT NULL,
  event_reference TEXT NOT NULL,
  title_reference TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, source_module, event_reference),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE event_sessions (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  session_reference TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'open', 'closed', 'cancelled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, event_id, session_reference),
  FOREIGN KEY (tenant_id, event_id) REFERENCES events(tenant_id, id) ON DELETE RESTRICT,
  CHECK (ends_at >= starts_at)
);

CREATE TABLE attendance_attempts (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_session_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  attempt_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'failed', 'replay', 'conflict')),
  reason_code TEXT NOT NULL,
  evidence_reference TEXT,
  idempotency_record_id TEXT NOT NULL,
  attempted_at INTEGER NOT NULL,
  retention_class TEXT NOT NULL,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, event_id) REFERENCES events(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, event_session_id) REFERENCES event_sessions(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (idempotency_record_id) REFERENCES idempotency_records(id) ON DELETE RESTRICT
);

CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_session_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  source_attempt_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'corrected', 'revoked')),
  active_marker TEXT CHECK (active_marker IS NULL OR active_marker = 'active'),
  confirmed_at INTEGER NOT NULL,
  corrected_by_record_id TEXT,
  revoked_at INTEGER,
  audit_reference TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, event_id) REFERENCES events(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, event_session_id) REFERENCES event_sessions(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, source_attempt_id) REFERENCES attendance_attempts(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, corrected_by_record_id) REFERENCES attendance_records(tenant_id, id) ON DELETE RESTRICT,
  CHECK ((status = 'confirmed' AND active_marker = 'active') OR (status <> 'confirmed' AND active_marker IS NULL))
);

CREATE TABLE redemption_intents (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  merchant_actor_type TEXT NOT NULL,
  merchant_actor_reference TEXT NOT NULL,
  point_program_id TEXT NOT NULL,
  requested_amount INTEGER NOT NULL CHECK (requested_amount > 0),
  token_reference TEXT,
  confirmation_reference TEXT,
  business_reference TEXT NOT NULL,
  idempotency_record_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  expires_at INTEGER NOT NULL,
  audit_reference TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, shop_id) REFERENCES shops(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, point_program_id) REFERENCES point_programs(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (idempotency_record_id) REFERENCES idempotency_records(id) ON DELETE RESTRICT
);

CREATE TABLE redemption_results (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  redemption_intent_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  merchant_actor_type TEXT NOT NULL,
  merchant_actor_reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'rejected', 'cancelled', 'reversed', 'corrected')),
  requested_amount INTEGER NOT NULL CHECK (requested_amount > 0),
  completed_amount INTEGER CHECK (completed_amount >= 0),
  point_transaction_id TEXT,
  original_result_id TEXT,
  receipt_reference TEXT,
  reason_code TEXT NOT NULL,
  completed_at INTEGER,
  reversed_at INTEGER,
  audit_reference TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, shop_id) REFERENCES shops(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, redemption_intent_id) REFERENCES redemption_intents(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, point_transaction_id) REFERENCES point_transactions(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, original_result_id) REFERENCES redemption_results(tenant_id, id) ON DELETE RESTRICT,
  CHECK ((status = 'completed' AND point_transaction_id IS NOT NULL AND completed_amount IS NOT NULL) OR status <> 'completed')
);

CREATE UNIQUE INDEX uq_attendance_records_active
  ON attendance_records(tenant_id, event_session_id, tenant_membership_id, active_marker);

CREATE UNIQUE INDEX uq_redemption_intents_business_ref
  ON redemption_intents(tenant_id, business_reference);

CREATE INDEX idx_attendance_attempts_member_time
  ON attendance_attempts(tenant_id, tenant_membership_id, attempted_at DESC, id DESC);

CREATE INDEX idx_attendance_records_member_time
  ON attendance_records(tenant_id, tenant_membership_id, confirmed_at DESC, id DESC);

CREATE INDEX idx_redemption_results_receipt
  ON redemption_results(tenant_id, receipt_reference);
