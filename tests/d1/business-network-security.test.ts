import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createPartnerUser, networkContext, networkHarness, resetNetworkDatabase,
  setupNetworkTenant,
} from "./business-network-helpers";

beforeEach(resetNetworkDatabase);

describe("Business Network Engine security and integrity", () => {
  it("enforces tenant isolation, active partner attribution and historical records", async () => {
    const { app } = networkHarness();
    const first = await setupNetworkTenant(app, "Tenant A");
    const second = await setupNetworkTenant(app, "Tenant B");
    const a = await createPartnerUser(app, first.tenant.id, first.ownerMembership.id, "A");
    const b = await createPartnerUser(app, second.tenant.id, second.ownerMembership.id, "B");

    await expect(app.createBusinessRelationship(
      first.tenant.id, first.ownerMembership.id,
      { sourcePartnerId: a.partner.id, targetPartnerId: b.partner.id, relationshipType: "referrer" },
      networkContext(),
    )).rejects.toMatchObject({ code: "NETWORK_NOT_FOUND" });
    await expect(app.updateNetworkPartnerStatus(
      first.tenant.id, first.ownerMembership.id, b.partner.id, "suspended", networkContext(),
    )).rejects.toMatchObject({ code: "NETWORK_NOT_FOUND" });

    const localB = await createPartnerUser(
      app, first.tenant.id, first.ownerMembership.id, "Local B",
    );
    const relationship = await app.createBusinessRelationship(
      first.tenant.id, first.ownerMembership.id,
      {
        sourcePartnerId: a.partner.id, targetPartnerId: localB.partner.id,
        relationshipType: "referrer",
      },
      networkContext(),
    );
    await app.closeBusinessRelationship(
      first.tenant.id, first.ownerMembership.id, relationship.id, networkContext(),
    );
    expect(await app.getMyReferrer(first.tenant.id, localB.membership.id)).toBeNull();
    await expect(env.DB.prepare(
      `DELETE FROM business_relationships WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(first.tenant.id, relationship.id).run()).rejects.toThrow(/relationship_history_immutable/);

    const referralLink = await app.createReferralLink(
      first.tenant.id, first.ownerMembership.id, a.partner.id,
      { referralCode: "ACTIVE-A", targetType: "order", targetReference: "offer" },
      networkContext(),
    );
    const buyerReference = `user:${localB.user.id}`;
    const touch = await app.recordReferralTouch(
      first.tenant.id, first.ownerMembership.id,
      { referralLinkId: referralLink.id, visitorReference: buyerReference, sourceChannel: "test" },
      networkContext(),
    );
    await app.updateNetworkPartnerStatus(
      first.tenant.id, first.ownerMembership.id, a.partner.id, "suspended", networkContext(),
    );
    const sale = await app.recordSale(
      first.tenant.id, first.ownerMembership.id,
      {
        buyerReference, targetType: "order", targetReference: "order",
        grossAmount: 100, currency: "TWD", occurredAt: touch.touchedAt + 1,
      },
      networkContext(),
    );
    await expect(app.attributeSale(
      first.tenant.id, first.ownerMembership.id, sale.id, networkContext(),
    )).rejects.toMatchObject({ code: "ATTRIBUTION_NOT_AVAILABLE" });
  });

  it("enforces schema objects, immutable attribution, paid commission and query indexes", async () => {
    const objects = await Promise.all([
      env.DB.prepare(
        `SELECT count(*) AS count FROM sqlite_master
         WHERE type = 'table' AND name IN (
           'network_partners','business_relationships','referral_links','referral_touches',
           'sales_records','attribution_records','commission_rules','commission_records',
           'partner_teams','partner_team_memberships'
         )`,
      ).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT count(*) AS count FROM sqlite_master
         WHERE type = 'index' AND name IN (
           'uq_network_partner_active_user','idx_network_partner_tenant_status',
           'uq_business_relationship_active','uq_business_relationship_target_active',
           'idx_relationship_source_status','idx_relationship_target_status',
           'idx_referral_link_partner_status','idx_referral_touch_visitor_time',
           'idx_referral_touch_link_time',
           'idx_referral_touch_partner_time','idx_sales_tenant_time','idx_sales_seller_time',
           'idx_attribution_partner_time','idx_commission_rule_match',
           'uq_commission_primary_sale','uq_commission_reversal','idx_commission_partner_time',
           'idx_commission_status_time','idx_team_tenant_status',
           'uq_team_membership_active','idx_team_membership_partner'
         )`,
      ).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT count(*) AS count FROM sqlite_master
         WHERE type = 'trigger' AND name IN (
           'trg_business_relationship_no_delete','trg_sales_no_delete',
           'trg_attribution_immutable_update','trg_attribution_immutable_delete',
           'trg_commission_paid_immutable','trg_commission_no_delete'
         )`,
      ).first<{ count: number }>(),
    ]);
    expect(objects.map((row) => row?.count)).toEqual([10, 21, 6]);
    const tenantTables = [
      "network_partners", "business_relationships", "referral_links", "referral_touches",
      "sales_records", "attribution_records", "commission_rules", "commission_records",
      "partner_teams", "partner_team_memberships",
    ];
    const foreignKeys = await Promise.all(
      tenantTables.map((table) => env.DB.prepare(`PRAGMA foreign_key_list(${table})`).all()),
    );
    expect(foreignKeys.reduce((sum, result) => sum + result.results.length, 0)).toBe(35);

    const plan = await env.DB.prepare(
      `EXPLAIN QUERY PLAN SELECT id FROM referral_touches
       WHERE tenant_id = ?1 AND visitor_reference = ?2 AND touched_at <= ?3
       ORDER BY touched_at, id LIMIT 1`,
    ).bind("tenant", "digest:0123456789abcdef0123456789abcdef", 1).all<{ detail: string }>();
    expect(plan.results.map(({ detail }) => detail).join("\n"))
      .toContain("idx_referral_touch_visitor_time");
    const violations = await env.DB.prepare("PRAGMA foreign_key_check").all();
    expect(violations.results).toEqual([]);
  });
  it("requires the application module gate and explicit Domain permissions", async () => {
    const { app } = networkHarness();
    const ownerUser = await app.createPlatformUser(networkContext());
    const tenant = await app.createTenant("Gate Tenant", networkContext());
    const membership = await app.addTenantMembership(
      tenant.id, ownerUser.id, "gate-owner", networkContext(),
    );
    await app.assignRole(tenant.id, membership.id, "tenant_owner", networkContext());
    expect(await app.checkPermission(tenant.id, membership.id, "network:manage")).toBe(false);
    await expect(app.createNetworkPartner(
      tenant.id, membership.id,
      { platformUserId: ownerUser.id, partnerType: "partner", displayName: "Denied" },
      networkContext(),
    )).rejects.toMatchObject({ code: "NETWORK_PERMISSION_DENIED" });

    const allowed = await setupNetworkTenant(app, "Entitled Tenant");
    const partner = await createPartnerUser(
      app, allowed.tenant.id, allowed.ownerMembership.id, "Entitled Partner",
    );
    const denied = networkHarness(false).app;
    await expect(denied.updateNetworkPartnerStatus(
      allowed.tenant.id, allowed.ownerMembership.id, partner.partner.id,
      "suspended", networkContext(),
    )).rejects.toThrow(/MODULE_NOT_ENTITLED/);
  });

  it("rejects expired touches, raw identity references and a second active referrer", async () => {
    const { app } = networkHarness();
    const { tenant, ownerMembership } = await setupNetworkTenant(app, "Invariant Tenant");
    const a = await createPartnerUser(app, tenant.id, ownerMembership.id, "A1");
    const b = await createPartnerUser(app, tenant.id, ownerMembership.id, "B1");
    const c = await createPartnerUser(app, tenant.id, ownerMembership.id, "C1");
    await app.createBusinessRelationship(
      tenant.id, ownerMembership.id,
      { sourcePartnerId: a.partner.id, targetPartnerId: b.partner.id, relationshipType: "referrer" },
      networkContext(),
    );
    await expect(app.createBusinessRelationship(
      tenant.id, ownerMembership.id,
      { sourcePartnerId: c.partner.id, targetPartnerId: b.partner.id, relationshipType: "referrer" },
      networkContext(),
    )).rejects.toThrow();
    const link = await app.createReferralLink(
      tenant.id, ownerMembership.id, a.partner.id,
      { referralCode: "EXPIRES-A", targetType: "order", targetReference: "offer" },
      networkContext(),
    );
    await expect(app.recordReferralTouch(
      tenant.id, ownerMembership.id,
      { referralLinkId: link.id, visitorReference: "raw-provider-subject", sourceChannel: "test" },
      networkContext(),
    )).rejects.toThrow(/digest or Platform User reference/);
    const reference = `user:${b.user.id}`;
    const touch = await app.recordReferralTouch(
      tenant.id, ownerMembership.id,
      { referralLinkId: link.id, visitorReference: reference, sourceChannel: "test" },
      networkContext(),
    );
    const sale = await app.recordSale(
      tenant.id, ownerMembership.id,
      {
        buyerReference: reference, targetType: "order", targetReference: "expired-order",
        grossAmount: 100, currency: "TWD", occurredAt: touch.expiresAt + 1,
      },
      networkContext(),
    );
    await expect(app.attributeSale(
      tenant.id, ownerMembership.id, sale.id, networkContext(),
    )).rejects.toMatchObject({ code: "ATTRIBUTION_NOT_AVAILABLE" });
  });
});