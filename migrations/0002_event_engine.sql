PRAGMA foreign_keys = ON;

CREATE TABLE events (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 3000),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'cancelled')),
  registration_opens_at INTEGER NOT NULL CHECK (registration_opens_at >= 0),
  registration_closes_at INTEGER NOT NULL CHECK (
    registration_closes_at > registration_opens_at
  ),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('free', 'status_only')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at INTEGER,
  cancelled_at INTEGER,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (status = 'draft' AND published_at IS NULL AND cancelled_at IS NULL)
    OR (status = 'published' AND published_at IS NOT NULL AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL)
  )
);

CREATE TABLE event_sessions (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  starts_at INTEGER NOT NULL CHECK (starts_at >= 0),
  ends_at INTEGER NOT NULL CHECK (ends_at > starts_at),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  waitlist_capacity INTEGER NOT NULL DEFAULT 0 CHECK (waitlist_capacity >= 0),
  confirmed_count INTEGER NOT NULL DEFAULT 0 CHECK (
    confirmed_count >= 0 AND confirmed_count <= capacity
  ),
  waitlisted_count INTEGER NOT NULL DEFAULT 0 CHECK (
    waitlisted_count >= 0 AND waitlisted_count <= waitlist_capacity
  ),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'cancelled')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES events(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE event_form_fields (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  field_key TEXT NOT NULL CHECK (length(field_key) BETWEEN 1 AND 80),
  label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 160),
  field_type TEXT NOT NULL CHECK (
    field_type IN ('text', 'number', 'choice', 'checkbox')
  ),
  required INTEGER NOT NULL CHECK (required IN (0, 1)),
  options_json TEXT CHECK (
    options_json IS NULL OR length(options_json) <= 2000
  ),
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES events(tenant_id, id) ON DELETE RESTRICT,
  CHECK (
    (field_type = 'choice' AND options_json IS NOT NULL)
    OR (field_type <> 'choice' AND options_json IS NULL)
  )
);

CREATE TABLE event_registrations (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_session_id TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('confirmed', 'waitlisted', 'cancelled')
  ),
  source_adapter TEXT NOT NULL CHECK (length(source_adapter) BETWEEN 1 AND 40),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  registered_at INTEGER NOT NULL CHECK (registered_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= registered_at),
  cancelled_at INTEGER,
  UNIQUE (tenant_id, event_id, id),
  UNIQUE (tenant_id, event_id, event_session_id, id),
  FOREIGN KEY (tenant_id, event_id, event_session_id)
    REFERENCES event_sessions(tenant_id, event_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (platform_user_id)
    REFERENCES platform_users(id) ON DELETE RESTRICT,
  CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status <> 'cancelled' AND cancelled_at IS NULL)
  )
);

CREATE TABLE event_registration_answers (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  registration_id TEXT NOT NULL,
  form_field_id TEXT NOT NULL,
  value_json TEXT NOT NULL CHECK (length(value_json) BETWEEN 1 AND 2048),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, registration_id, form_field_id),
  FOREIGN KEY (tenant_id, event_id, registration_id)
    REFERENCES event_registrations(tenant_id, event_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, event_id, form_field_id)
    REFERENCES event_form_fields(tenant_id, event_id, id) ON DELETE RESTRICT
);

CREATE TABLE event_payments (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  registration_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'not_required', 'pending', 'authorized', 'paid',
      'failed', 'refunded', 'cancelled'
    )
  ),
  amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'TWD' CHECK (length(currency) = 3),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, registration_id),
  FOREIGN KEY (tenant_id, event_id, registration_id)
    REFERENCES event_registrations(tenant_id, event_id, id) ON DELETE RESTRICT
);

CREATE TABLE event_checkins (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_session_id TEXT NOT NULL,
  registration_id TEXT NOT NULL,
  verified_by_membership_id TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('manual', 'qr')),
  token_digest TEXT CHECK (
    token_digest IS NULL OR (
      length(token_digest) = 64
      AND token_digest NOT GLOB '*[^0-9a-f]*'
    )
  ),
  status TEXT NOT NULL CHECK (status IN ('verified', 'revoked')),
  checked_in_at INTEGER NOT NULL CHECK (checked_in_at >= 0),
  revoked_at INTEGER,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, event_id, event_session_id, registration_id, id),
  FOREIGN KEY (tenant_id, event_id, event_session_id, registration_id)
    REFERENCES event_registrations(
      tenant_id, event_id, event_session_id, id
    ) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, verified_by_membership_id)
    REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  CHECK (
    (method = 'manual' AND token_digest IS NULL)
    OR (method = 'qr' AND token_digest IS NOT NULL)
  ),
  CHECK (
    (status = 'verified' AND revoked_at IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);

CREATE TABLE event_share_links (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_session_id TEXT,
  created_by_membership_id TEXT NOT NULL,
  adapter_key TEXT NOT NULL CHECK (length(adapter_key) BETWEEN 1 AND 40),
  payload_version INTEGER NOT NULL DEFAULT 1 CHECK (payload_version > 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  revoked_at INTEGER,
  UNIQUE (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES events(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, event_id, event_session_id)
    REFERENCES event_sessions(tenant_id, event_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, created_by_membership_id)
    REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  CHECK (
    (status = 'active' AND revoked_at IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);

CREATE TABLE event_share_touches (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  share_link_id TEXT NOT NULL,
  platform_user_id TEXT,
  touched_at INTEGER NOT NULL CHECK (touched_at >= 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  FOREIGN KEY (tenant_id, event_id, share_link_id)
    REFERENCES event_share_links(tenant_id, event_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (platform_user_id)
    REFERENCES platform_users(id) ON DELETE RESTRICT
);

CREATE TABLE event_notifications (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  registration_id TEXT,
  recipient_platform_user_id TEXT,
  notification_type TEXT NOT NULL CHECK (
    notification_type IN (
      'registration_confirmed', 'registration_waitlisted',
      'registration_cancelled', 'waitlist_promoted', 'event_cancelled'
    )
  ),
  adapter_key TEXT NOT NULL CHECK (length(adapter_key) BETWEEN 1 AND 40),
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'sent', 'failed', 'cancelled')
  ),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  sent_at INTEGER,
  UNIQUE (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES events(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, event_id, registration_id)
    REFERENCES event_registrations(tenant_id, event_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (recipient_platform_user_id)
    REFERENCES platform_users(id) ON DELETE RESTRICT,
  CHECK (
    (status = 'sent' AND sent_at IS NOT NULL)
    OR (status <> 'sent' AND sent_at IS NULL)
  )
);

CREATE INDEX idx_events_tenant_status_updated
  ON events(tenant_id, status, updated_at DESC, id);

CREATE INDEX idx_event_sessions_event_time
  ON event_sessions(tenant_id, event_id, starts_at, id);

CREATE INDEX idx_event_sessions_tenant_time
  ON event_sessions(tenant_id, status, starts_at, id);

CREATE UNIQUE INDEX uq_event_form_fields_active_key
  ON event_form_fields(tenant_id, event_id, field_key)
  WHERE status = 'active';

CREATE INDEX idx_event_form_fields_event_order
  ON event_form_fields(tenant_id, event_id, status, display_order, id);

CREATE UNIQUE INDEX uq_event_registrations_active_user
  ON event_registrations(
    tenant_id, event_session_id, platform_user_id
  )
  WHERE status IN ('confirmed', 'waitlisted');

CREATE INDEX idx_event_registrations_roster
  ON event_registrations(
    tenant_id, event_id, event_session_id, status, registered_at, id
  );

CREATE INDEX idx_event_registrations_user
  ON event_registrations(
    tenant_id, platform_user_id, status, registered_at DESC, id
  );

CREATE INDEX idx_event_registrations_waitlist
  ON event_registrations(
    tenant_id, event_session_id, status, registered_at, id
  );

CREATE INDEX idx_event_answers_registration
  ON event_registration_answers(tenant_id, registration_id, form_field_id);

CREATE INDEX idx_event_payments_status
  ON event_payments(tenant_id, event_id, status, updated_at, id);

CREATE UNIQUE INDEX uq_event_checkins_verified_registration
  ON event_checkins(tenant_id, registration_id)
  WHERE status = 'verified';

CREATE UNIQUE INDEX uq_event_checkins_qr_digest
  ON event_checkins(tenant_id, token_digest)
  WHERE status = 'verified' AND token_digest IS NOT NULL;

CREATE INDEX idx_event_checkins_session_time
  ON event_checkins(
    tenant_id, event_id, event_session_id, status, checked_in_at, id
  );

CREATE INDEX idx_event_share_links_event_status
  ON event_share_links(tenant_id, event_id, status, created_at, id);

CREATE INDEX idx_event_share_touches_link_time
  ON event_share_touches(tenant_id, share_link_id, touched_at, id);

CREATE INDEX idx_event_share_touches_event_time
  ON event_share_touches(tenant_id, event_id, touched_at, id);

CREATE INDEX idx_event_notifications_pending
  ON event_notifications(tenant_id, status, created_at, id);

CREATE INDEX idx_event_notifications_registration
  ON event_notifications(tenant_id, registration_id, created_at, id);

CREATE TRIGGER trg_events_terminal_status
BEFORE UPDATE OF status ON events
FOR EACH ROW
WHEN OLD.status = 'cancelled' AND NEW.status <> 'cancelled'
  OR OLD.status = 'published' AND NEW.status = 'draft'
BEGIN
  SELECT RAISE(ABORT, 'event_invalid_status_transition');
END;

CREATE TRIGGER trg_event_registration_insert_guard
BEFORE INSERT ON event_registrations
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM events AS event
      JOIN event_sessions AS session
        ON session.tenant_id = event.tenant_id
        AND session.event_id = event.id
      WHERE event.tenant_id = NEW.tenant_id
        AND event.id = NEW.event_id
        AND event.status = 'published'
        AND session.id = NEW.event_session_id
        AND session.status = 'scheduled'
    ) THEN RAISE(ABORT, 'event_registration_invalid_scope')
    WHEN NEW.status = 'confirmed' AND NOT EXISTS (
      SELECT 1 FROM event_sessions
      WHERE tenant_id = NEW.tenant_id
        AND event_id = NEW.event_id
        AND id = NEW.event_session_id
        AND confirmed_count < capacity
    ) THEN RAISE(ABORT, 'event_capacity_full')
    WHEN NEW.status = 'waitlisted' AND NOT EXISTS (
      SELECT 1 FROM event_sessions
      WHERE tenant_id = NEW.tenant_id
        AND event_id = NEW.event_id
        AND id = NEW.event_session_id
        AND waitlisted_count < waitlist_capacity
    ) THEN RAISE(ABORT, 'event_waitlist_full')
  END;
END;

CREATE TRIGGER trg_event_registration_insert_count
AFTER INSERT ON event_registrations
FOR EACH ROW
WHEN NEW.status IN ('confirmed', 'waitlisted')
BEGIN
  UPDATE event_sessions
  SET confirmed_count = confirmed_count
        + CASE WHEN NEW.status = 'confirmed' THEN 1 ELSE 0 END,
      waitlisted_count = waitlisted_count
        + CASE WHEN NEW.status = 'waitlisted' THEN 1 ELSE 0 END,
      version = version + 1,
      updated_at = NEW.registered_at
  WHERE tenant_id = NEW.tenant_id
    AND event_id = NEW.event_id
    AND id = NEW.event_session_id;
END;

CREATE TRIGGER trg_event_registration_status_guard
BEFORE UPDATE OF status ON event_registrations
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN OLD.status = 'cancelled' AND NEW.status <> 'cancelled'
      THEN RAISE(ABORT, 'event_registration_terminal')
    WHEN OLD.status = 'confirmed' AND NEW.status = 'waitlisted'
      THEN RAISE(ABORT, 'event_registration_invalid_transition')
    WHEN OLD.status <> 'confirmed' AND NEW.status = 'confirmed'
      AND NOT EXISTS (
        SELECT 1 FROM event_sessions
        WHERE tenant_id = NEW.tenant_id
          AND event_id = NEW.event_id
          AND id = NEW.event_session_id
          AND status = 'scheduled'
          AND confirmed_count < capacity
      ) THEN RAISE(ABORT, 'event_capacity_full')
  END;
END;

CREATE TRIGGER trg_event_registration_status_count
AFTER UPDATE OF status ON event_registrations
FOR EACH ROW
WHEN OLD.status <> NEW.status
BEGIN
  UPDATE event_sessions
  SET confirmed_count = confirmed_count
        - CASE WHEN OLD.status = 'confirmed' THEN 1 ELSE 0 END
        + CASE WHEN NEW.status = 'confirmed' THEN 1 ELSE 0 END,
      waitlisted_count = waitlisted_count
        - CASE WHEN OLD.status = 'waitlisted' THEN 1 ELSE 0 END
        + CASE WHEN NEW.status = 'waitlisted' THEN 1 ELSE 0 END,
      version = version + 1,
      updated_at = NEW.updated_at
  WHERE tenant_id = NEW.tenant_id
    AND event_id = NEW.event_id
    AND id = NEW.event_session_id;
END;

CREATE TRIGGER trg_event_registration_no_delete
BEFORE DELETE ON event_registrations
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'event_registration_history_required');
END;

CREATE TRIGGER trg_event_checkin_guard
BEFORE INSERT ON event_checkins
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM event_registrations AS registration
  JOIN events AS event
    ON event.tenant_id = registration.tenant_id
    AND event.id = registration.event_id
  JOIN event_sessions AS session
    ON session.tenant_id = registration.tenant_id
    AND session.event_id = registration.event_id
    AND session.id = registration.event_session_id
  WHERE registration.tenant_id = NEW.tenant_id
    AND registration.event_id = NEW.event_id
    AND registration.event_session_id = NEW.event_session_id
    AND registration.id = NEW.registration_id
    AND registration.status = 'confirmed'
    AND event.status = 'published'
    AND session.status = 'scheduled'
)
BEGIN
  SELECT RAISE(ABORT, 'event_checkin_not_eligible');
END;

CREATE TRIGGER trg_event_checkin_no_delete
BEFORE DELETE ON event_checkins
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'event_checkin_history_required');
END;
