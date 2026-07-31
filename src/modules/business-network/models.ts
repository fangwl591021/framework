export type PartnerType =
  | "salesperson" | "affiliate" | "agent" | "distributor" | "partner" | "referrer";
export type PartnerStatus = "active" | "suspended" | "closed";
export type RelationshipType =
  | "referrer" | "sponsor" | "manager" | "team_member" | "agency" | "distributor";
export type SaleStatus = "pending" | "confirmed" | "cancelled" | "refunded" | "reversed";
export type CommissionStatus =
  | "calculated" | "approved" | "payable" | "paid" | "reversed" | "cancelled";

export interface NetworkPartner {
  readonly id: string;
  readonly tenantId: string;
  readonly platformUserId: string;
  readonly partnerType: PartnerType;
  readonly status: PartnerStatus;
  readonly displayName: string;
  readonly joinedAt: number;
}

export interface BusinessRelationship {
  readonly id: string;
  readonly tenantId: string;
  readonly sourcePartnerId: string;
  readonly targetPartnerId: string;
  readonly relationshipType: RelationshipType;
  readonly status: "active" | "closed";
  readonly effectiveFrom: number;
  readonly effectiveTo: number | null;
}

export interface ReferralLink {
  readonly id: string;
  readonly tenantId: string;
  readonly partnerId: string;
  readonly referralCode: string;
  readonly targetType: string;
  readonly targetReference: string;
  readonly status: "active" | "suspended" | "expired" | "revoked";
  readonly validFrom: number;
  readonly validUntil: number | null;
}

export interface ReferralTouch {
  readonly id: string;
  readonly tenantId: string;
  readonly referralLinkId: string;
  readonly referrerPartnerId: string;
  readonly visitorReference: string;
  readonly sourceChannel: string;
  readonly touchedAt: number;
  readonly expiresAt: number;
}

export interface SaleRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly buyerReference: string;
  readonly sellerPartnerId: string | null;
  readonly targetType: string;
  readonly targetReference: string;
  readonly grossAmount: number;
  readonly currency: string;
  readonly status: SaleStatus;
  readonly occurredAt: number;
}

export interface AttributionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly salesRecordId: string;
  readonly attributedPartnerId: string;
  readonly attributionMethod: "first_valid_touch" | "manual";
  readonly referralTouchId: string | null;
  readonly ruleVersion: string;
  readonly attributedAt: number;
}

export interface CommissionRule {
  readonly id: string;
  readonly tenantId: string;
  readonly ruleKey: string;
  readonly name: string;
  readonly calculationType: "percentage" | "fixed";
  /** Integer basis points for percentage rules. */
  readonly rate: number | null;
  readonly fixedAmount: number | null;
  readonly currency: string;
  readonly appliesToTargetType: string;
  readonly appliesToTargetReference: string | null;
  readonly priority: number;
  readonly status: "draft" | "active" | "suspended" | "retired";
  readonly validFrom: number;
  readonly validUntil: number | null;
}

export interface CommissionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly salesRecordId: string;
  readonly attributedPartnerId: string;
  readonly commissionRuleId: string;
  readonly reversalOfCommissionId: string | null;
  readonly baseAmount: number;
  readonly commissionAmount: number;
  readonly currency: string;
  readonly status: CommissionStatus;
}

export interface PartnerTeam {
  readonly id: string;
  readonly tenantId: string;
  readonly teamKey: string;
  readonly name: string;
  readonly status: "active" | "suspended" | "closed";
}

export interface PerformanceSummary {
  readonly salesCount: number;
  readonly grossAmount: number;
  readonly commissionAmount: number;
  readonly currency: string | null;
}

export class BusinessNetworkError extends Error {
  constructor(
    public readonly code:
      | "MODULE_NOT_ENTITLED"
      | "NETWORK_PERMISSION_DENIED"
      | "NETWORK_INVALID_STATE"
      | "NETWORK_NOT_FOUND"
      | "NETWORK_TENANT_BOUNDARY"
      | "NETWORK_IDEMPOTENCY_CONFLICT"
      | "ATTRIBUTION_NOT_AVAILABLE"
      | "COMMISSION_RULE_NOT_AVAILABLE"
      | "COMMISSION_CURRENCY_MISMATCH"
      | "COMMISSION_ALREADY_EXISTS"
      | "COMMISSION_INVALID_TRANSITION",
  ) {
    super(code);
  }
}
