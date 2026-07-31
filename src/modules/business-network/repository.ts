import type {
  AttributionRecord, BusinessRelationship, CommissionRecord, CommissionRule,
  NetworkPartner, PartnerTeam, PerformanceSummary, ReferralLink, ReferralTouch, SaleRecord,
} from "./models";

type PartnerRow = {
  id: string; tenant_id: string; platform_user_id: string; partner_type: NetworkPartner["partnerType"];
  status: NetworkPartner["status"]; display_name: string; joined_at: number;
};
type RelationshipRow = {
  id: string; tenant_id: string; source_partner_id: string; target_partner_id: string;
  relationship_type: BusinessRelationship["relationshipType"]; status: BusinessRelationship["status"];
  effective_from: number; effective_to: number | null;
};
type LinkRow = {
  id: string; tenant_id: string; partner_id: string; referral_code: string; target_type: string;
  target_reference: string; status: ReferralLink["status"]; valid_from: number; valid_until: number | null;
};
type TouchRow = {
  id: string; tenant_id: string; referral_link_id: string; referrer_partner_id: string;
  visitor_reference: string; source_channel: string; touched_at: number; expires_at: number;
};
type SaleRow = {
  id: string; tenant_id: string; buyer_reference: string; seller_partner_id: string | null;
  target_type: string; target_reference: string; gross_amount: number; currency: string;
  status: SaleRecord["status"]; occurred_at: number;
};
type AttributionRow = {
  id: string; tenant_id: string; sales_record_id: string; attributed_partner_id: string;
  attribution_method: AttributionRecord["attributionMethod"]; referral_touch_id: string | null;
  rule_version: string; attributed_at: number;
};
type RuleRow = {
  id: string; tenant_id: string; rule_key: string; name: string;
  calculation_type: CommissionRule["calculationType"]; rate: number | null; fixed_amount: number | null;
  currency: string; applies_to_target_type: string; applies_to_target_reference: string | null;
  priority: number; status: CommissionRule["status"]; valid_from: number; valid_until: number | null;
};
type CommissionRow = {
  id: string; tenant_id: string; sales_record_id: string; attributed_partner_id: string;
  commission_rule_id: string; reversal_of_commission_id: string | null; base_amount: number;
  commission_amount: number; currency: string; status: CommissionRecord["status"];
};
type TeamRow = { id: string; tenant_id: string; team_key: string; name: string; status: PartnerTeam["status"] };

const partner = (r: PartnerRow): NetworkPartner => ({
  id: r.id, tenantId: r.tenant_id, platformUserId: r.platform_user_id, partnerType: r.partner_type,
  status: r.status, displayName: r.display_name, joinedAt: r.joined_at,
});
const relationship = (r: RelationshipRow): BusinessRelationship => ({
  id: r.id, tenantId: r.tenant_id, sourcePartnerId: r.source_partner_id,
  targetPartnerId: r.target_partner_id, relationshipType: r.relationship_type,
  status: r.status, effectiveFrom: r.effective_from, effectiveTo: r.effective_to,
});
const link = (r: LinkRow): ReferralLink => ({
  id: r.id, tenantId: r.tenant_id, partnerId: r.partner_id, referralCode: r.referral_code,
  targetType: r.target_type, targetReference: r.target_reference, status: r.status,
  validFrom: r.valid_from, validUntil: r.valid_until,
});
const touch = (r: TouchRow): ReferralTouch => ({
  id: r.id, tenantId: r.tenant_id, referralLinkId: r.referral_link_id,
  referrerPartnerId: r.referrer_partner_id, visitorReference: r.visitor_reference,
  sourceChannel: r.source_channel, touchedAt: r.touched_at, expiresAt: r.expires_at,
});
const sale = (r: SaleRow): SaleRecord => ({
  id: r.id, tenantId: r.tenant_id, buyerReference: r.buyer_reference,
  sellerPartnerId: r.seller_partner_id, targetType: r.target_type,
  targetReference: r.target_reference, grossAmount: r.gross_amount, currency: r.currency,
  status: r.status, occurredAt: r.occurred_at,
});
const attribution = (r: AttributionRow): AttributionRecord => ({
  id: r.id, tenantId: r.tenant_id, salesRecordId: r.sales_record_id,
  attributedPartnerId: r.attributed_partner_id, attributionMethod: r.attribution_method,
  referralTouchId: r.referral_touch_id, ruleVersion: r.rule_version, attributedAt: r.attributed_at,
});
const rule = (r: RuleRow): CommissionRule => ({
  id: r.id, tenantId: r.tenant_id, ruleKey: r.rule_key, name: r.name,
  calculationType: r.calculation_type, rate: r.rate, fixedAmount: r.fixed_amount,
  currency: r.currency, appliesToTargetType: r.applies_to_target_type,
  appliesToTargetReference: r.applies_to_target_reference, priority: r.priority,
  status: r.status, validFrom: r.valid_from, validUntil: r.valid_until,
});
const commission = (r: CommissionRow): CommissionRecord => ({
  id: r.id, tenantId: r.tenant_id, salesRecordId: r.sales_record_id,
  attributedPartnerId: r.attributed_partner_id, commissionRuleId: r.commission_rule_id,
  reversalOfCommissionId: r.reversal_of_commission_id, baseAmount: r.base_amount,
  commissionAmount: r.commission_amount, currency: r.currency, status: r.status,
});

export class BusinessNetworkRepository {
  constructor(private readonly db: D1Database) {}

  async getPartner(tenantId: string, id: string): Promise<NetworkPartner | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, platform_user_id, partner_type, status, display_name, joined_at
       FROM network_partners WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(tenantId, id).first<PartnerRow>();
    return row ? partner(row) : null;
  }

  async findPartnerByUser(tenantId: string, userId: string): Promise<NetworkPartner | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, platform_user_id, partner_type, status, display_name, joined_at
       FROM network_partners WHERE tenant_id = ?1 AND platform_user_id = ?2 AND status = 'active' LIMIT 1`,
    ).bind(tenantId, userId).first<PartnerRow>();
    return row ? partner(row) : null;
  }

  async getRelationship(tenantId: string, id: string): Promise<BusinessRelationship | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, source_partner_id, target_partner_id, relationship_type,
              status, effective_from, effective_to
       FROM business_relationships WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(tenantId, id).first<RelationshipRow>();
    return row ? relationship(row) : null;
  }

  async getActiveReferrer(tenantId: string, targetId: string): Promise<BusinessRelationship | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, source_partner_id, target_partner_id, relationship_type,
              status, effective_from, effective_to
       FROM business_relationships
       WHERE tenant_id = ?1 AND target_partner_id = ?2 AND relationship_type = 'referrer'
         AND status = 'active' ORDER BY effective_from, id LIMIT 1`,
    ).bind(tenantId, targetId).first<RelationshipRow>();
    return row ? relationship(row) : null;
  }

  async listReferrals(tenantId: string, partnerId: string, limit = 50): Promise<readonly BusinessRelationship[]> {
    const result = await this.db.prepare(
      `SELECT id, tenant_id, source_partner_id, target_partner_id, relationship_type,
              status, effective_from, effective_to
       FROM business_relationships
       WHERE tenant_id = ?1 AND source_partner_id = ?2 AND relationship_type = 'referrer'
       ORDER BY effective_from DESC, id DESC LIMIT ?3`,
    ).bind(tenantId, partnerId, Math.max(1, Math.min(limit, 100))).all<RelationshipRow>();
    return result.results.map(relationship);
  }

  async getReferralLink(tenantId: string, id: string): Promise<ReferralLink | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, partner_id, referral_code, target_type, target_reference,
              status, valid_from, valid_until
       FROM referral_links WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(tenantId, id).first<LinkRow>();
    return row ? link(row) : null;
  }

  async findFirstValidTouch(
    tenantId: string, visitorReference: string, occurredAt: number,
  ): Promise<ReferralTouch | null> {
    const row = await this.db.prepare(
      `SELECT touch.id, touch.tenant_id, touch.referral_link_id, touch.referrer_partner_id,
              touch.visitor_reference, touch.source_channel, touch.touched_at, touch.expires_at
       FROM referral_touches AS touch
       JOIN referral_links AS link ON link.tenant_id = touch.tenant_id AND link.id = touch.referral_link_id
       JOIN network_partners AS partner ON partner.tenant_id = touch.tenant_id AND partner.id = touch.referrer_partner_id
       WHERE touch.tenant_id = ?1 AND touch.visitor_reference = ?2
         AND touch.touched_at <= ?3 AND touch.expires_at >= ?3
         AND link.status = 'active' AND link.valid_from <= ?3
         AND (link.valid_until IS NULL OR link.valid_until >= ?3)
         AND partner.status = 'active'
       ORDER BY touch.touched_at, touch.id LIMIT 1`,
    ).bind(tenantId, visitorReference, occurredAt).first<TouchRow>();
    return row ? touch(row) : null;
  }

  async getSale(tenantId: string, id: string): Promise<SaleRecord | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, buyer_reference, seller_partner_id, target_type,
              target_reference, gross_amount, currency, status, occurred_at
       FROM sales_records WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(tenantId, id).first<SaleRow>();
    return row ? sale(row) : null;
  }

  async getAttribution(tenantId: string, saleId: string): Promise<AttributionRecord | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, sales_record_id, attributed_partner_id, attribution_method,
              referral_touch_id, rule_version, attributed_at
       FROM attribution_records WHERE tenant_id = ?1 AND sales_record_id = ?2`,
    ).bind(tenantId, saleId).first<AttributionRow>();
    return row ? attribution(row) : null;
  }

  async getRule(tenantId: string, id: string): Promise<CommissionRule | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, rule_key, name, calculation_type, rate, fixed_amount,
              currency, applies_to_target_type, applies_to_target_reference, priority,
              status, valid_from, valid_until
       FROM commission_rules WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(tenantId, id).first<RuleRow>();
    return row ? rule(row) : null;
  }
  async findRule(tenantId: string, saleRecord: SaleRecord): Promise<CommissionRule | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, rule_key, name, calculation_type, rate, fixed_amount,
              currency, applies_to_target_type, applies_to_target_reference, priority,
              status, valid_from, valid_until
       FROM commission_rules
       WHERE tenant_id = ?1 AND status = 'active' AND currency = ?2
         AND applies_to_target_type = ?3
         AND (applies_to_target_reference IS NULL OR applies_to_target_reference = ?4)
         AND valid_from <= ?5 AND (valid_until IS NULL OR valid_until >= ?5)
       ORDER BY priority DESC, CASE WHEN applies_to_target_reference IS NULL THEN 1 ELSE 0 END, id
       LIMIT 1`,
    ).bind(
      tenantId, saleRecord.currency, saleRecord.targetType,
      saleRecord.targetReference, saleRecord.occurredAt,
    ).first<RuleRow>();
    return row ? rule(row) : null;
  }

  async getCommission(tenantId: string, id: string): Promise<CommissionRecord | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, sales_record_id, attributed_partner_id, commission_rule_id,
              reversal_of_commission_id, base_amount, commission_amount, currency, status
       FROM commission_records WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(tenantId, id).first<CommissionRow>();
    return row ? commission(row) : null;
  }

  async getCommissionBySale(tenantId: string, saleId: string): Promise<CommissionRecord | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, sales_record_id, attributed_partner_id, commission_rule_id,
              reversal_of_commission_id, base_amount, commission_amount, currency, status
       FROM commission_records
       WHERE tenant_id = ?1 AND sales_record_id = ?2 AND reversal_of_commission_id IS NULL`,
    ).bind(tenantId, saleId).first<CommissionRow>();
    return row ? commission(row) : null;
  }

  async listCommissions(
    tenantId: string, partnerId: string | null,
    from = 0, until = Number.MAX_SAFE_INTEGER, limit = 50,
  ): Promise<readonly CommissionRecord[]> {
    const safe = Math.max(1, Math.min(limit, 100));
    const result = partnerId
      ? await this.db.prepare(
          `SELECT id, tenant_id, sales_record_id, attributed_partner_id, commission_rule_id,
                  reversal_of_commission_id, base_amount, commission_amount, currency, status
           FROM commission_records
           WHERE tenant_id = ?1 AND attributed_partner_id = ?2
             AND calculated_at BETWEEN ?3 AND ?4
           ORDER BY calculated_at DESC, id DESC LIMIT ?5`,
        ).bind(tenantId, partnerId, from, until, safe).all<CommissionRow>()
      : await this.db.prepare(
          `SELECT id, tenant_id, sales_record_id, attributed_partner_id, commission_rule_id,
                  reversal_of_commission_id, base_amount, commission_amount, currency, status
           FROM commission_records
           WHERE tenant_id = ?1 AND calculated_at BETWEEN ?2 AND ?3
           ORDER BY calculated_at DESC, id DESC LIMIT ?4`,
        ).bind(tenantId, from, until, safe).all<CommissionRow>();
    return result.results.map(commission);
  }
  async getTeam(tenantId: string, id: string): Promise<PartnerTeam | null> {
    const row = await this.db.prepare(
      `SELECT id, tenant_id, team_key, name, status FROM partner_teams
       WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(tenantId, id).first<TeamRow>();
    return row ? { id: row.id, tenantId: row.tenant_id, teamKey: row.team_key, name: row.name, status: row.status } : null;
  }

  async performance(
    tenantId: string, partnerId: string | null, from: number, until: number,
  ): Promise<PerformanceSummary> {
    const row = await this.db.prepare(
      `WITH scoped_sales AS (
         SELECT sale.id, sale.gross_amount, sale.currency
         FROM sales_records AS sale
         LEFT JOIN attribution_records AS attribution
           ON attribution.tenant_id = sale.tenant_id
          AND attribution.sales_record_id = sale.id
         WHERE sale.tenant_id = ?1 AND sale.occurred_at BETWEEN ?2 AND ?3
           AND (?4 IS NULL OR attribution.attributed_partner_id = ?4)
       )
       SELECT count(*) AS sales_count,
              coalesce(sum(gross_amount), 0) AS gross_amount,
              coalesce((
                SELECT sum(commission.commission_amount)
                FROM commission_records AS commission
                JOIN scoped_sales ON scoped_sales.id = commission.sales_record_id
                WHERE commission.tenant_id = ?1
              ), 0) AS commission_amount,
              min(currency) AS currency
       FROM scoped_sales`,
    ).bind(tenantId, from, until, partnerId).first<{
      sales_count: number; gross_amount: number; commission_amount: number; currency: string | null;
    }>();
    return {
      salesCount: row?.sales_count ?? 0, grossAmount: row?.gross_amount ?? 0,
      commissionAmount: row?.commission_amount ?? 0, currency: row?.currency ?? null,
    };
  }
}
