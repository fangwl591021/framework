import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createPartnerUser, networkContext, networkHarness, resetNetworkDatabase,
  setupNetworkTenant,
} from "./business-network-helpers";

beforeEach(resetNetworkDatabase);

describe("Business Network Engine MVP flow", () => {
  it("runs referral, first-valid attribution, commission, reversal and team reporting", async () => {
    const { app, clock } = networkHarness();
    const { tenant, ownerMembership } = await setupNetworkTenant(app, "Network Tenant");
    const a = await createPartnerUser(app, tenant.id, ownerMembership.id, "Partner A");
    const b = await createPartnerUser(app, tenant.id, ownerMembership.id, "Partner B");

    const relationship = await app.createBusinessRelationship(
      tenant.id, ownerMembership.id,
      { sourcePartnerId: a.partner.id, targetPartnerId: b.partner.id, relationshipType: "referrer" },
      networkContext(),
    );
    expect(await app.getMyReferrer(tenant.id, b.membership.id)).toMatchObject({
      id: relationship.id, sourcePartnerId: a.partner.id,
    });

    const referralLink = await app.createReferralLink(
      tenant.id, ownerMembership.id, a.partner.id,
      { referralCode: "PARTNER-A", targetType: "order", targetReference: "offer-1" },
      networkContext(),
    );
    const buyerReference = `user:${b.user.id}`;
    const firstTouch = await app.recordReferralTouch(
      tenant.id, ownerMembership.id,
      { referralLinkId: referralLink.id, visitorReference: buyerReference, sourceChannel: "local-test" },
      networkContext(),
    );
    await app.recordReferralTouch(
      tenant.id, ownerMembership.id,
      {
        referralLinkId: referralLink.id, visitorReference: buyerReference,
        sourceChannel: "later-test", touchedAt: firstTouch.touchedAt + 1,
      },
      networkContext(),
    );

    const saleContext = networkContext("sale-once");
    const sale = await app.recordSale(
      tenant.id, ownerMembership.id,
      {
        buyerReference, targetType: "order", targetReference: "order-100",
        grossAmount: 1000, currency: "TWD", occurredAt: firstTouch.touchedAt + 100,
      },
      saleContext,
    );
    expect(await app.recordSale(
      tenant.id, ownerMembership.id,
      {
        buyerReference, targetType: "order", targetReference: "order-100",
        grossAmount: 1000, currency: "TWD", occurredAt: firstTouch.touchedAt + 100,
      },
      saleContext,
    )).toEqual(sale);
    await expect(app.recordSale(
      tenant.id, ownerMembership.id,
      {
        buyerReference, targetType: "order", targetReference: "changed",
        grossAmount: 1000, currency: "TWD", occurredAt: firstTouch.touchedAt + 100,
      },
      saleContext,
    )).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });

    const attribution = await app.attributeSale(
      tenant.id, ownerMembership.id, sale.id, networkContext("attribute-once"),
    );
    expect(attribution).toMatchObject({
      attributedPartnerId: a.partner.id, referralTouchId: firstTouch.id,
      attributionMethod: "first_valid_touch",
    });
    await expect(env.DB.prepare(
      `UPDATE attribution_records SET rule_version = 'changed'
       WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(tenant.id, attribution.id).run()).rejects.toThrow(/attribution_immutable/);
    const rule = await app.createCommissionRule(
      tenant.id, ownerMembership.id,
      {
        ruleKey: "ORDER_10_PERCENT", name: "Order 10%", calculationType: "percentage",
        rate: 1000, currency: "TWD", targetType: "order", priority: 100,
      },
      networkContext(),
    );
    const calculated = await app.calculateCommission(
      tenant.id, ownerMembership.id, sale.id, networkContext("calculate-once"),
    );
    expect(calculated).toMatchObject({
      commissionRuleId: rule.id, attributedPartnerId: a.partner.id,
      baseAmount: 1000, commissionAmount: 100, currency: "TWD", status: "calculated",
    });
    const approved = await app.approveCommission(
      tenant.id, ownerMembership.id, calculated.id, networkContext(),
    );
    const paid = await app.markCommissionPaid(
      tenant.id, ownerMembership.id, approved.id, networkContext(),
    );
    expect(await app.getMyCommission(tenant.id, a.membership.id)).toContainEqual(paid);
    await expect(env.DB.prepare(
      `UPDATE commission_records SET status = 'cancelled'
       WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(tenant.id, paid.id).run()).rejects.toThrow(/paid_commission_immutable/);
    expect(await app.getMyCommission(tenant.id, b.membership.id)).toEqual([]);

    const team = await app.createPartnerTeam(
      tenant.id, ownerMembership.id, { teamKey: "north", name: "North Team" }, networkContext(),
    );
    await app.addPartnerToTeam(
      tenant.id, ownerMembership.id, team.id, a.partner.id, "lead", networkContext(),
    );
    expect(await app.getTeamPerformance(
      tenant.id, ownerMembership.id, team.id, clock.current() - 100_000, clock.current() + 100_000,
    )).toMatchObject({ salesCount: 1, grossAmount: 1000, commissionAmount: 100 });

    await app.updateSaleStatus(
      tenant.id, ownerMembership.id, sale.id, "refunded", networkContext(),
    );
    const reversed = await app.reverseCommission(
      tenant.id, ownerMembership.id, paid.id, networkContext("reverse-once"),
    );
    expect(reversed).toMatchObject({
      reversalOfCommissionId: paid.id, commissionAmount: -100, status: "reversed",
    });
    await expect(app.reverseCommission(
      tenant.id, ownerMembership.id, paid.id, networkContext(),
    )).rejects.toThrow();

    const audit = await app.repositories.audit.listForTenant(tenant.id);
    expect(audit.map(({ action }) => action)).toEqual(expect.arrayContaining([
      "network.partner.create", "network.relationship.create", "network.referral_touch.record",
      "network.sale.record", "network.sale.attribute", "network.commission.calculate",
      "network.commission.approved", "network.commission.paid", "network.commission.reverse",
    ]));
    expect(JSON.stringify(audit)).not.toContain(buyerReference);
    const stored = await env.DB.prepare(
      `SELECT operation, stored_result_json FROM idempotency_records
       WHERE tenant_id = ?1 AND operation LIKE 'network.%' ORDER BY operation LIMIT 100`,
    ).bind(tenant.id).all<{ operation: string; stored_result_json: string }>();
    expect(JSON.stringify(stored.results)).not.toContain(buyerReference);
  });
});
