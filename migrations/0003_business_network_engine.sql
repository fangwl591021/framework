PRAGMA foreign_keys = ON;

-- Domain Module permissions are registered through a reviewed migration.
-- Core continues to own the permission table and restores its immutable guard.
DROP TRIGGER trg_permissions_immutable_insert;
INSERT INTO permissions (id, permission_key, description, status, created_at, updated_at) VALUES
  ('019a0000-0000-7000-8000-000000000101', 'network:read', 'Read business network records', 'active', 1785456000000, 1785456000000),
  ('019a0000-0000-7000-8000-000000000102', 'network:manage', 'Manage partners and relationships', 'active', 1785456000000, 1785456000000),
  ('019a0000-0000-7000-8000-000000000103', 'referral:read', 'Read referral records', 'active', 1785456000000, 1785456000000),
  ('019a0000-0000-7000-8000-000000000104', 'referral:manage', 'Manage referral links and touches', 'active', 1785456000000, 1785456000000),
  ('019a0000-0000-7000-8000-000000000105', 'sales:read', 'Read sales and attribution records', 'active', 1785456000000, 1785456000000),
  ('019a0000-0000-7000-8000-000000000106', 'sales:manage', 'Manage sales and attribution records', 'active', 1785456000000, 1785456000000),
  ('019a0000-0000-7000-8000-000000000107', 'commission:read_self', 'Read own commission records', 'active', 1785456000000, 1785456000000),
  ('019a0000-0000-7000-8000-000000000108', 'commission:read_all', 'Read all tenant commission records', 'active', 1785456000000, 1785456000000),
  ('019a0000-0000-7000-8000-000000000109', 'commission:manage', 'Manage commission rules and lifecycle', 'active', 1785456000000, 1785456000000),
  ('019a0000-0000-7000-8000-000000000110', 'team:read', 'Read partner teams', 'active', 1785456000000, 1785456000000),
  ('019a0000-0000-7000-8000-000000000111', 'team:manage', 'Manage partner teams', 'active', 1785456000000, 1785456000000);
CREATE TRIGGER trg_permissions_immutable_insert
BEFORE INSERT ON permissions FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'permission_vocabulary_immutable');
END;

CREATE TABLE network_partners (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('salesperson','affiliate','agent','distributor','partner','referrer')),
  status TEXT NOT NULL CHECK (status IN ('active','suspended','closed')),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  joined_at INTEGER NOT NULL CHECK (joined_at >= 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (platform_user_id) REFERENCES platform_users(id)
);

CREATE TABLE business_relationships (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  source_partner_id TEXT NOT NULL,
  target_partner_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('referrer','sponsor','manager','team_member','agency','distributor')),
  status TEXT NOT NULL CHECK (status IN ('active','closed')),
  effective_from INTEGER NOT NULL CHECK (effective_from >= 0),
  effective_to INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  CHECK (source_partner_id <> target_partner_id),
  CHECK ((status = 'active' AND effective_to IS NULL) OR (status = 'closed' AND effective_to IS NOT NULL)),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, source_partner_id) REFERENCES network_partners(tenant_id, id),
  FOREIGN KEY (tenant_id, target_partner_id) REFERENCES network_partners(tenant_id, id)
);

CREATE TABLE referral_links (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  referral_code TEXT NOT NULL CHECK (length(referral_code) BETWEEN 6 AND 80),
  target_type TEXT NOT NULL CHECK (length(target_type) BETWEEN 2 AND 80),
  target_reference TEXT NOT NULL CHECK (length(target_reference) BETWEEN 1 AND 255),
  status TEXT NOT NULL CHECK (status IN ('active','suspended','expired','revoked')),
  valid_from INTEGER NOT NULL,
  valid_until INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, referral_code),
  FOREIGN KEY (tenant_id, partner_id) REFERENCES network_partners(tenant_id, id)
);

CREATE TABLE referral_touches (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  referral_link_id TEXT NOT NULL,
  referrer_partner_id TEXT NOT NULL,
  visitor_reference TEXT NOT NULL CHECK (
    visitor_reference GLOB 'digest:[0-9a-f]*' OR visitor_reference GLOB 'user:????????-????-7???-????-????????????'
  ),
  source_channel TEXT NOT NULL CHECK (length(source_channel) BETWEEN 2 AND 80),
  touched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > touched_at),
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, referral_link_id) REFERENCES referral_links(tenant_id, id),
  FOREIGN KEY (tenant_id, referrer_partner_id) REFERENCES network_partners(tenant_id, id)
);

CREATE TABLE sales_records (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  buyer_reference TEXT NOT NULL CHECK (
    buyer_reference GLOB 'digest:[0-9a-f]*' OR buyer_reference GLOB 'user:????????-????-7???-????-????????????'
  ),
  seller_partner_id TEXT,
  target_type TEXT NOT NULL CHECK (length(target_type) BETWEEN 2 AND 80),
  target_reference TEXT NOT NULL CHECK (length(target_reference) BETWEEN 1 AND 255),
  gross_amount INTEGER NOT NULL CHECK (gross_amount > 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','cancelled','refunded','reversed')),
  occurred_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (tenant_id, seller_partner_id) REFERENCES network_partners(tenant_id, id)
);

CREATE TABLE attribution_records (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  sales_record_id TEXT NOT NULL,
  attributed_partner_id TEXT NOT NULL,
  attribution_method TEXT NOT NULL CHECK (attribution_method = 'first_valid_touch'),
  referral_touch_id TEXT,
  rule_version TEXT NOT NULL CHECK (length(rule_version) BETWEEN 1 AND 40),
  attributed_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, sales_record_id),
  FOREIGN KEY (tenant_id, sales_record_id) REFERENCES sales_records(tenant_id, id),
  FOREIGN KEY (tenant_id, attributed_partner_id) REFERENCES network_partners(tenant_id, id),
  FOREIGN KEY (tenant_id, referral_touch_id) REFERENCES referral_touches(tenant_id, id)
);

CREATE TABLE commission_rules (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  rule_key TEXT NOT NULL CHECK (length(rule_key) BETWEEN 2 AND 80),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('percentage','fixed')),
  rate INTEGER,
  fixed_amount INTEGER,
  currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
  applies_to_target_type TEXT NOT NULL,
  applies_to_target_reference TEXT,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 0 AND 1000000),
  status TEXT NOT NULL CHECK (status IN ('draft','active','suspended','retired')),
  valid_from INTEGER NOT NULL,
  valid_until INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  CHECK (
    (calculation_type = 'percentage' AND rate BETWEEN 0 AND 10000 AND fixed_amount IS NULL)
    OR (calculation_type = 'fixed' AND rate IS NULL AND fixed_amount >= 0)
  ),
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, rule_key),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE commission_records (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  sales_record_id TEXT NOT NULL,
  attributed_partner_id TEXT NOT NULL,
  commission_rule_id TEXT NOT NULL,
  reversal_of_commission_id TEXT,
  base_amount INTEGER NOT NULL CHECK (base_amount >= 0),
  commission_amount INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
  status TEXT NOT NULL CHECK (status IN ('calculated','approved','payable','paid','reversed','cancelled')),
  calculated_at INTEGER NOT NULL,
  approved_at INTEGER,
  paid_at INTEGER,
  reversed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  CHECK (
    (reversal_of_commission_id IS NULL AND commission_amount >= 0)
    OR (reversal_of_commission_id IS NOT NULL AND commission_amount <= 0 AND status = 'reversed')
  ),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, sales_record_id) REFERENCES sales_records(tenant_id, id),
  FOREIGN KEY (tenant_id, attributed_partner_id) REFERENCES network_partners(tenant_id, id),
  FOREIGN KEY (tenant_id, commission_rule_id) REFERENCES commission_rules(tenant_id, id),
  FOREIGN KEY (tenant_id, reversal_of_commission_id) REFERENCES commission_records(tenant_id, id)
);

CREATE TABLE partner_teams (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  team_key TEXT NOT NULL CHECK (length(team_key) BETWEEN 2 AND 80),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  status TEXT NOT NULL CHECK (status IN ('active','suspended','closed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, team_key),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE partner_team_memberships (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 AND substr(id, 15, 1) = '7'),
  tenant_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  role_in_team TEXT NOT NULL CHECK (length(role_in_team) BETWEEN 2 AND 80),
  status TEXT NOT NULL CHECK (status IN ('active','closed')),
  joined_at INTEGER NOT NULL,
  left_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  CHECK ((status = 'active' AND left_at IS NULL) OR (status = 'closed' AND left_at IS NOT NULL)),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, team_id) REFERENCES partner_teams(tenant_id, id),
  FOREIGN KEY (tenant_id, partner_id) REFERENCES network_partners(tenant_id, id)
);

CREATE UNIQUE INDEX uq_network_partner_active_user ON network_partners(tenant_id, platform_user_id) WHERE status = 'active';
CREATE INDEX idx_network_partner_tenant_status ON network_partners(tenant_id, status, id);
CREATE UNIQUE INDEX uq_business_relationship_active ON business_relationships(tenant_id, source_partner_id, target_partner_id, relationship_type) WHERE status = 'active';
CREATE UNIQUE INDEX uq_business_relationship_target_active ON business_relationships(tenant_id, target_partner_id, relationship_type) WHERE status = 'active';
CREATE INDEX idx_relationship_source_status ON business_relationships(tenant_id, source_partner_id, relationship_type, status);
CREATE INDEX idx_relationship_target_status ON business_relationships(tenant_id, target_partner_id, relationship_type, status);
CREATE INDEX idx_referral_link_partner_status ON referral_links(tenant_id, partner_id, status, valid_from);
CREATE INDEX idx_referral_touch_visitor_time ON referral_touches(tenant_id, visitor_reference, touched_at, id);
CREATE INDEX idx_referral_touch_link_time ON referral_touches(tenant_id, referral_link_id, touched_at, id);
CREATE INDEX idx_referral_touch_partner_time ON referral_touches(tenant_id, referrer_partner_id, touched_at, id);
CREATE INDEX idx_sales_tenant_time ON sales_records(tenant_id, occurred_at DESC, status, id);
CREATE INDEX idx_sales_seller_time ON sales_records(tenant_id, seller_partner_id, occurred_at DESC);
CREATE INDEX idx_attribution_partner_time ON attribution_records(tenant_id, attributed_partner_id, attributed_at DESC);
CREATE INDEX idx_commission_rule_match ON commission_rules(tenant_id, status, applies_to_target_type, applies_to_target_reference, priority, valid_from);
CREATE UNIQUE INDEX uq_commission_primary_sale ON commission_records(tenant_id, sales_record_id) WHERE reversal_of_commission_id IS NULL;
CREATE UNIQUE INDEX uq_commission_reversal ON commission_records(tenant_id, reversal_of_commission_id) WHERE reversal_of_commission_id IS NOT NULL;
CREATE INDEX idx_commission_partner_time ON commission_records(tenant_id, attributed_partner_id, status, calculated_at DESC, id);
CREATE INDEX idx_commission_status_time ON commission_records(tenant_id, status, calculated_at, id);
CREATE INDEX idx_team_tenant_status ON partner_teams(tenant_id, status, id);
CREATE UNIQUE INDEX uq_team_membership_active ON partner_team_memberships(tenant_id, team_id, partner_id) WHERE status = 'active';
CREATE INDEX idx_team_membership_partner ON partner_team_memberships(tenant_id, partner_id, status, team_id);

CREATE TRIGGER trg_business_relationship_no_delete
BEFORE DELETE ON business_relationships BEGIN SELECT RAISE(ABORT, 'relationship_history_immutable'); END;
CREATE TRIGGER trg_sales_no_delete
BEFORE DELETE ON sales_records BEGIN SELECT RAISE(ABORT, 'sale_history_immutable'); END;
CREATE TRIGGER trg_attribution_immutable_update
BEFORE UPDATE ON attribution_records BEGIN SELECT RAISE(ABORT, 'attribution_immutable'); END;
CREATE TRIGGER trg_attribution_immutable_delete
BEFORE DELETE ON attribution_records BEGIN SELECT RAISE(ABORT, 'attribution_immutable'); END;
CREATE TRIGGER trg_commission_paid_immutable
BEFORE UPDATE ON commission_records
FOR EACH ROW WHEN OLD.status = 'paid'
BEGIN SELECT RAISE(ABORT, 'paid_commission_immutable'); END;
CREATE TRIGGER trg_commission_no_delete
BEFORE DELETE ON commission_records BEGIN SELECT RAISE(ABORT, 'commission_history_immutable'); END;
