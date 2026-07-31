import type {
  AttributionRecord, BusinessRelationship, CommissionRecord, NetworkPartner, PerformanceSummary,
} from "./models";
import { BusinessNetworkError } from "./models";
import { SalesCommissionApplication } from "./sales-commission-application";

export class BusinessNetworkApplication extends SalesCommissionApplication {
  async getMyPerformance(
    tenantId: string, membershipId: string, from: number, until: number,
  ): Promise<PerformanceSummary> {
    const partner = await this.requireSelfPartner(tenantId, membershipId);
    await this.requireNetworkPermission(tenantId, membershipId, "salesRead");
    return this.networkRepository.performance(tenantId, partner.id, from, until);
  }

  async getMyCommission(
    tenantId: string, membershipId: string,
    from = 0, until = Number.MAX_SAFE_INTEGER, limit = 50,
  ): Promise<readonly CommissionRecord[]> {
    await this.requireNetworkPermission(tenantId, membershipId, "commissionReadSelf");
    const partner = await this.requireSelfPartner(tenantId, membershipId);
    return this.networkRepository.listCommissions(tenantId, partner.id, from, until, limit);
  }

  async getCommissionSummary(
    tenantId: string, membershipId: string, from: number, until: number,
  ): Promise<PerformanceSummary> {
    await this.requireNetworkPermission(tenantId, membershipId, "commissionReadAll");
    return this.networkRepository.performance(tenantId, null, from, until);
  }

  async getMyReferrer(
    tenantId: string, membershipId: string,
  ): Promise<BusinessRelationship | null> {
    await this.requireNetworkPermission(tenantId, membershipId, "referralRead");
    const partner = await this.requireSelfPartner(tenantId, membershipId);
    return this.networkRepository.getActiveReferrer(tenantId, partner.id);
  }

  async getMyReferrals(
    tenantId: string, membershipId: string,
    from = 0, until = Number.MAX_SAFE_INTEGER, limit = 50,
  ): Promise<readonly BusinessRelationship[]> {
    await this.requireNetworkPermission(tenantId, membershipId, "referralRead");
    const partner = await this.requireSelfPartner(tenantId, membershipId);
    return this.networkRepository.listReferrals(tenantId, partner.id, limit);
  }

  async getSaleAttribution(
    tenantId: string, membershipId: string, saleId: string,
  ): Promise<AttributionRecord | null> {
    await this.requireNetworkPermission(tenantId, membershipId, "salesRead");
    return this.networkRepository.getAttribution(tenantId, saleId);
  }

  async getTeamPerformance(
    tenantId: string, membershipId: string, teamId: string, from: number, until: number,
  ): Promise<PerformanceSummary> {
    await this.requireNetworkPermission(tenantId, membershipId, "teamRead");
    if (!await this.networkRepository.getTeam(tenantId, teamId)) {
      throw new BusinessNetworkError("NETWORK_NOT_FOUND");
    }
    const row = await this.db.prepare(
      `WITH team_sales AS (
         SELECT DISTINCT sale.id, sale.gross_amount, sale.currency
         FROM partner_team_memberships AS team_member
         JOIN attribution_records AS attribution
          ON attribution.tenant_id = team_member.tenant_id
         AND attribution.attributed_partner_id = team_member.partner_id
        JOIN sales_records AS sale
          ON sale.tenant_id = attribution.tenant_id
         AND sale.id = attribution.sales_record_id
        WHERE team_member.tenant_id = ?1 AND team_member.team_id = ?2
          AND team_member.status = 'active' AND sale.occurred_at BETWEEN ?3 AND ?4
       )
       SELECT count(*) AS sales_count, coalesce(sum(gross_amount), 0) AS gross_amount,
              coalesce((
                SELECT sum(commission.commission_amount)
                FROM commission_records AS commission
                JOIN team_sales ON team_sales.id = commission.sales_record_id
                WHERE commission.tenant_id = ?1
              ), 0) AS commission_amount,
              min(currency) AS currency
       FROM team_sales`,
    ).bind(tenantId, teamId, from, until).first<{
      sales_count: number; gross_amount: number; commission_amount: number; currency: string | null;
    }>();
    return {
      salesCount: row?.sales_count ?? 0, grossAmount: row?.gross_amount ?? 0,
      commissionAmount: row?.commission_amount ?? 0, currency: row?.currency ?? null,
    };
  }

  private async requireSelfPartner(
    tenantId: string, membershipId: string,
  ): Promise<NetworkPartner> {
    const membership = await this.repositories.memberships.getById(tenantId, membershipId);
    if (!membership || membership.status !== "active") {
      throw new BusinessNetworkError("NETWORK_PERMISSION_DENIED");
    }
    const partner = await this.networkRepository.findPartnerByUser(
      tenantId, membership.platformUserId,
    );
    if (!partner) throw new BusinessNetworkError("NETWORK_NOT_FOUND");
    return partner;
  }
}
