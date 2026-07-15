-- PROPOSAL ONLY
-- DO NOT EXECUTE
-- NOT AN APPROVED MIGRATION
-- NOT TESTED AGAINST D1

CREATE TABLE referral_invitations (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  inviter_membership_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'accepted', 'expired', 'revoked')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  UNIQUE (tenant_id, token_hash),
  FOREIGN KEY (tenant_id, inviter_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE referral_relationships (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  member_membership_id TEXT NOT NULL,
  referrer_membership_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'replaced', 'revoked', 'corrected')),
  active_marker TEXT CHECK (active_marker IS NULL OR active_marker = 'active'),
  source TEXT NOT NULL,
  confirmed_at INTEGER NOT NULL,
  replaced_by_relationship_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revoked_at INTEGER,
  audit_reference TEXT,
  UNIQUE (tenant_id, id),

  FOREIGN KEY (tenant_id, member_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, referrer_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, replaced_by_relationship_id) REFERENCES referral_relationships(tenant_id, id) ON DELETE RESTRICT,
  CHECK (member_membership_id <> referrer_membership_id),
  CHECK ((status = 'active' AND active_marker = 'active') OR (status <> 'active' AND active_marker IS NULL))
);

CREATE TABLE share_links (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  promoter_membership_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_reference TEXT NOT NULL,
  campaign_reference TEXT,
  policy_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, promoter_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE attribution_touches (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  share_link_id TEXT,
  anonymous_visitor_hash TEXT,
  resolved_platform_user_id TEXT,
  resolved_tenant_membership_id TEXT,
  channel TEXT NOT NULL,
  touch_type TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  deduplication_key TEXT NOT NULL,
  evidence_reference TEXT,
  retention_class TEXT NOT NULL,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, deduplication_key),
  FOREIGN KEY (tenant_id, share_link_id) REFERENCES share_links(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (resolved_platform_user_id) REFERENCES platform_users(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, resolved_tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  CHECK (anonymous_visitor_hash IS NOT NULL OR resolved_platform_user_id IS NOT NULL OR resolved_tenant_membership_id IS NOT NULL)
);

CREATE TABLE conversions (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  source_module TEXT NOT NULL,
  conversion_type TEXT NOT NULL,
  conversion_reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'reversed', 'corrected')),
  occurred_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, conversion_type, conversion_reference),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE attribution_records (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  conversion_id TEXT NOT NULL,
  promoter_membership_id TEXT,
  winning_touch_id TEXT,
  policy TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  window_seconds INTEGER NOT NULL CHECK (window_seconds >= 0),
  decision_reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'unattributed', 'corrected', 'reversed')),
  active_marker TEXT CHECK (active_marker IS NULL OR active_marker = 'active'),
  decided_at INTEGER NOT NULL,
  corrected_by_record_id TEXT,
  reversed_at INTEGER,
  created_at INTEGER NOT NULL,
  audit_reference TEXT,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, conversion_id) REFERENCES conversions(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, promoter_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, winning_touch_id) REFERENCES attribution_touches(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, corrected_by_record_id) REFERENCES attribution_records(tenant_id, id) ON DELETE RESTRICT,
  CHECK ((status IN ('active', 'unattributed') AND active_marker = 'active') OR (status IN ('corrected', 'reversed') AND active_marker IS NULL)),
  CHECK ((status = 'unattributed' AND promoter_membership_id IS NULL) OR status <> 'unattributed')
);

CREATE UNIQUE INDEX uq_referral_relationships_active
  ON referral_relationships(tenant_id, member_membership_id, active_marker);

CREATE UNIQUE INDEX uq_share_links_token
  ON share_links(tenant_id, token_hash);

CREATE UNIQUE INDEX uq_attribution_records_active
  ON attribution_records(tenant_id, conversion_id, active_marker);

CREATE INDEX idx_referral_relationships_history
  ON referral_relationships(tenant_id, member_membership_id, confirmed_at DESC, id DESC);

CREATE INDEX idx_attribution_touches_window
  ON attribution_touches(tenant_id, share_link_id, occurred_at DESC, id DESC);

CREATE INDEX idx_attribution_records_conversion
  ON attribution_records(tenant_id, conversion_id, status, decided_at DESC, id DESC);
