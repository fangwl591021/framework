import type { NetworkMutationContext } from "./business-network-base";
import { CommissionCalculator } from "./commission-calculator";
import { AttributionService } from "./attribution-service";
import {
  BusinessNetworkError, type AttributionRecord, type CommissionRecord,
  type CommissionRule, type SaleRecord, type SaleStatus,
} from "./models";
import { PartnerReferralApplication } from "./partner-referral-application";

export class SalesCommissionApplication extends PartnerReferralApplication {
  private readonly calculator = new CommissionCalculator();
  private readonly attribution = new AttributionService(this.networkRepository);

  async recordSale(
    tenantId: string, actorMembershipId: string,
    input: {
      buyerReference: string; sellerPartnerId?: string; targetType: string;
      targetReference: string; grossAmount: number; currency: string; occurredAt?: number;
    },
    context: NetworkMutationContext,
  ): Promise<SaleRecord> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "salesManage");
    this.reference(input.buyerReference);
    this.text("targetType", input.targetType, 80);
    this.text("targetReference", input.targetReference, 255);
    if (!Number.isSafeInteger(input.grossAmount) || input.grossAmount <= 0) {
      throw new TypeError("grossAmount must be a positive integer minor-unit amount");
    }
    if (!/^[A-Z]{3}$/.test(input.currency)) throw new TypeError("currency is invalid");
    if (input.sellerPartnerId) await this.requirePartner(tenantId, input.sellerPartnerId, true);
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.sale.record", input, context,
      (now) => {
        const occurredAt = input.occurredAt ?? now;
        const result: SaleRecord = {
          id, tenantId, buyerReference: "redacted",
          sellerPartnerId: input.sellerPartnerId ?? null, targetType: input.targetType,
          targetReference: input.targetReference, grossAmount: input.grossAmount,
          currency: input.currency, status: "confirmed", occurredAt,
        };
        return {
          result,
          statements: [this.db.prepare(
            `INSERT INTO sales_records (
               id, tenant_id, buyer_reference, seller_partner_id, target_type,
               target_reference, gross_amount, currency, status, occurred_at,
               created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'confirmed', ?9, ?10, ?10)`,
          ).bind(
            id, tenantId, input.buyerReference, input.sellerPartnerId ?? null,
            input.targetType, input.targetReference, input.grossAmount,
            input.currency, occurredAt, now,
          )],
          audit: {
            action: "network.sale.record", resourceType: "sales_record",
            resourceReference: id, reasonCode: "CONFIRMED",
          },
        };
      },
    );
  }

  async updateSaleStatus(
    tenantId: string, actorMembershipId: string, saleId: string,
    status: Exclude<SaleStatus, "pending" | "confirmed">, context: NetworkMutationContext,
  ): Promise<SaleRecord> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "salesManage");
    const current = await this.networkRepository.getSale(tenantId, saleId);
    if (!current || !["confirmed", "refunded"].includes(current.status)) {
      throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    }
    if (current.status === "refunded" && status !== "reversed") {
      throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.sale.status",
      { saleId, status }, context, (now) => ({
        result: { ...current, buyerReference: "redacted", status },
        statements: [this.db.prepare(
          `UPDATE sales_records SET status = ?1, updated_at = ?2
           WHERE tenant_id = ?3 AND id = ?4 AND status = ?5`,
        ).bind(status, now, tenantId, saleId, current.status)],
        audit: {
          action: "network.sale.status", resourceType: "sales_record",
          resourceReference: saleId, reasonCode: status.toUpperCase(),
        },
      }),
    );
  }

  async attributeSale(
    tenantId: string, actorMembershipId: string, saleId: string,
    context: NetworkMutationContext,
  ): Promise<AttributionRecord> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "salesManage");
    const sale = await this.networkRepository.getSale(tenantId, saleId);
    if (!sale || sale.status !== "confirmed") {
      throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    }
    const touch = await this.attribution.firstValidTouch(tenantId, sale);
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.sale.attribute",
      { saleId, method: "first_valid_touch" }, context, (now) => ({
        result: {
          id, tenantId, salesRecordId: saleId, attributedPartnerId: touch.referrerPartnerId,
          attributionMethod: "first_valid_touch" as const, referralTouchId: touch.id,
          ruleVersion: "first-valid-touch-v1", attributedAt: now,
        },
        statements: [this.db.prepare(
          `INSERT INTO attribution_records (
             id, tenant_id, sales_record_id, attributed_partner_id, attribution_method,
             referral_touch_id, rule_version, attributed_at, created_at
           ) VALUES (?1, ?2, ?3, ?4, 'first_valid_touch', ?5, 'first-valid-touch-v1', ?6, ?6)`,
        ).bind(id, tenantId, saleId, touch.referrerPartnerId, touch.id, now)],
        audit: {
          action: "network.sale.attribute", resourceType: "attribution_record",
          resourceReference: id, reasonCode: "FIRST_VALID_TOUCH",
        },
      }),
    );
  }

  async createCommissionRule(
    tenantId: string, actorMembershipId: string,
    input: {
      ruleKey: string; name: string; calculationType: "percentage" | "fixed";
      rate?: number; fixedAmount?: number; currency: string; targetType: string;
      targetReference?: string; priority: number; validFrom?: number; validUntil?: number;
    },
    context: NetworkMutationContext,
  ): Promise<CommissionRule> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "commissionManage");
    this.text("ruleKey", input.ruleKey, 80);
    this.text("name", input.name, 120);
    if (!/^[A-Z]{3}$/.test(input.currency)) throw new TypeError("currency is invalid");
    if (!Number.isSafeInteger(input.priority) || input.priority < 0) {
      throw new TypeError("priority is invalid");
    }
    if (
      input.calculationType === "percentage"
      && (!Number.isInteger(input.rate) || input.rate! < 0 || input.rate! > 10000)
    ) throw new TypeError("rate must be integer basis points");
    if (
      input.calculationType === "fixed"
      && (!Number.isSafeInteger(input.fixedAmount) || input.fixedAmount! < 0)
    ) throw new TypeError("fixedAmount must be integer minor units");
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.commission_rule.create", input, context,
      (now) => {
        const result: CommissionRule = {
          id, tenantId, ruleKey: input.ruleKey, name: input.name,
          calculationType: input.calculationType,
          rate: input.calculationType === "percentage" ? input.rate! : null,
          fixedAmount: input.calculationType === "fixed" ? input.fixedAmount! : null,
          currency: input.currency, appliesToTargetType: input.targetType,
          appliesToTargetReference: input.targetReference ?? null, priority: input.priority,
          status: "active", validFrom: input.validFrom ?? now, validUntil: input.validUntil ?? null,
        };
        return {
          result,
          statements: [this.db.prepare(
            `INSERT INTO commission_rules (
               id, tenant_id, rule_key, name, calculation_type, rate, fixed_amount,
               currency, applies_to_target_type, applies_to_target_reference, priority,
               status, valid_from, valid_until, created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,
                       'active', ?12, ?13, ?14, ?14)`,
          ).bind(
            id, tenantId, result.ruleKey, result.name, result.calculationType,
            result.rate, result.fixedAmount, result.currency, result.appliesToTargetType,
            result.appliesToTargetReference, result.priority, result.validFrom,
            result.validUntil, now,
          )],
          audit: {
            action: "network.commission_rule.create", resourceType: "commission_rule",
            resourceReference: id, reasonCode: "CREATED",
          },
        };
      },
    );
  }

  async updateCommissionRuleStatus(
    tenantId: string, actorMembershipId: string, ruleId: string,
    status: "active" | "suspended" | "retired", context: NetworkMutationContext,
  ): Promise<CommissionRule> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "commissionManage");
    const current = await this.networkRepository.getRule(tenantId, ruleId);
    if (!current || current.status === "retired" || current.status === status) {
      throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.commission_rule.status",
      { ruleId, status }, context, (now) => ({
        result: { ...current, status },
        statements: [this.db.prepare(
          `UPDATE commission_rules SET status = ?1, updated_at = ?2
           WHERE tenant_id = ?3 AND id = ?4 AND status = ?5`,
        ).bind(status, now, tenantId, ruleId, current.status)],
        audit: {
          action: "network.commission_rule.status", resourceType: "commission_rule",
          resourceReference: ruleId, reasonCode: status.toUpperCase(),
        },
      }),
    );
  }
  async calculateCommission(
    tenantId: string, actorMembershipId: string, saleId: string,
    context: NetworkMutationContext,
  ): Promise<CommissionRecord> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "commissionManage");
    const sale = await this.networkRepository.getSale(tenantId, saleId);
    const attribution = await this.networkRepository.getAttribution(tenantId, saleId);
    if (!sale || sale.status !== "confirmed" || !attribution) {
      throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    }
    const rule = await this.networkRepository.findRule(tenantId, sale);
    if (!rule) throw new BusinessNetworkError("COMMISSION_RULE_NOT_AVAILABLE");
    const id = this.uuidv7.generate();
    const amount = this.calculator.calculate(sale, rule);
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.commission.calculate",
      { saleId, ruleId: rule.id }, context, (now) => ({
        result: {
          id, tenantId, salesRecordId: saleId,
          attributedPartnerId: attribution.attributedPartnerId,
          commissionRuleId: rule.id, reversalOfCommissionId: null,
          baseAmount: sale.grossAmount, commissionAmount: amount,
          currency: sale.currency, status: "calculated" as const,
        },
        statements: [this.db.prepare(
          `INSERT INTO commission_records (
             id, tenant_id, sales_record_id, attributed_partner_id, commission_rule_id,
             reversal_of_commission_id, base_amount, commission_amount, currency,
             status, calculated_at, approved_at, paid_at, reversed_at, created_at, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7, ?8,
                     'calculated', ?9, NULL, NULL, NULL, ?9, ?9)`,
        ).bind(
          id, tenantId, saleId, attribution.attributedPartnerId, rule.id,
          sale.grossAmount, amount, sale.currency, now,
        )],
        audit: {
          action: "network.commission.calculate", resourceType: "commission_record",
          resourceReference: id, reasonCode: "CALCULATED",
        },
      }),
    );
  }

  async approveCommission(
    tenantId: string, actorMembershipId: string, commissionId: string,
    context: NetworkMutationContext,
  ): Promise<CommissionRecord> {
    return this.transitionCommission(
      tenantId, actorMembershipId, commissionId, "calculated", "approved", context,
    );
  }

  async markCommissionPaid(
    tenantId: string, actorMembershipId: string, commissionId: string,
    context: NetworkMutationContext,
  ): Promise<CommissionRecord> {
    return this.transitionCommission(
      tenantId, actorMembershipId, commissionId, "approved", "paid", context,
    );
  }

  async reverseCommission(
    tenantId: string, actorMembershipId: string, commissionId: string,
    context: NetworkMutationContext,
  ): Promise<CommissionRecord> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "commissionManage");
    const original = await this.networkRepository.getCommission(tenantId, commissionId);
    if (!original || original.reversalOfCommissionId || original.status !== "paid") {
      throw new BusinessNetworkError("COMMISSION_INVALID_TRANSITION");
    }
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.commission.reverse",
      { commissionId }, context, (now) => ({
        result: {
          ...original, id, reversalOfCommissionId: original.id,
          commissionAmount: -original.commissionAmount, status: "reversed" as const,
        },
        statements: [this.db.prepare(
          `INSERT INTO commission_records (
             id, tenant_id, sales_record_id, attributed_partner_id, commission_rule_id,
             reversal_of_commission_id, base_amount, commission_amount, currency,
             status, calculated_at, approved_at, paid_at, reversed_at, created_at, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
                     'reversed', ?10, NULL, NULL, ?10, ?10, ?10)`,
        ).bind(
          id, tenantId, original.salesRecordId, original.attributedPartnerId,
          original.commissionRuleId, original.id, original.baseAmount,
          -original.commissionAmount, original.currency, now,
        )],
        audit: {
          action: "network.commission.reverse", resourceType: "commission_record",
          resourceReference: id, reasonCode: "REVERSED",
        },
      }),
    );
  }

  private async transitionCommission(
    tenantId: string, actorMembershipId: string, commissionId: string,
    expected: CommissionRecord["status"], next: CommissionRecord["status"],
    context: NetworkMutationContext,
  ): Promise<CommissionRecord> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "commissionManage");
    const current = await this.networkRepository.getCommission(tenantId, commissionId);
    if (!current || current.status !== expected || current.reversalOfCommissionId) {
      throw new BusinessNetworkError("COMMISSION_INVALID_TRANSITION");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, `network.commission.${next}`,
      { commissionId }, context, (now) => ({
        result: { ...current, status: next },
        statements: [this.db.prepare(
          `UPDATE commission_records
           SET status = ?1,
               approved_at = CASE WHEN ?1 = 'approved' THEN ?2 ELSE approved_at END,
               paid_at = CASE WHEN ?1 = 'paid' THEN ?2 ELSE paid_at END,
               updated_at = ?2
           WHERE tenant_id = ?3 AND id = ?4 AND status = ?5`,
        ).bind(next, now, tenantId, commissionId, expected)],
        audit: {
          action: `network.commission.${next}`, resourceType: "commission_record",
          resourceReference: commissionId, reasonCode: next.toUpperCase(),
        },
      }),
    );
  }

  private reference(value: string): void {
    if (!/^digest:[0-9a-f]{32,128}$/.test(value) && !/^user:[0-9a-f-]{36}$/.test(value)) {
      throw new TypeError("reference must be a digest or Platform User reference");
    }
  }
}
