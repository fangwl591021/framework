import { describe, expect, it } from "vitest";
import {
  BusinessNetworkError, CommissionCalculator,
  type CommissionRule, type SaleRecord,
} from "../src/modules/business-network";

const sale: SaleRecord = {
  id: "sale", tenantId: "tenant", buyerReference: "redacted", sellerPartnerId: null,
  targetType: "order", targetReference: "order-1", grossAmount: 1005,
  currency: "TWD", status: "confirmed", occurredAt: 1,
};

const rule = (overrides: Partial<CommissionRule>): CommissionRule => ({
  id: "rule", tenantId: "tenant", ruleKey: "rule", name: "Rule",
  calculationType: "percentage", rate: 1000, fixedAmount: null, currency: "TWD",
  appliesToTargetType: "order", appliesToTargetReference: null, priority: 1,
  status: "active", validFrom: 0, validUntil: null, ...overrides,
});

describe("CommissionCalculator", () => {
  it("uses integer basis points with deterministic half-up rounding", () => {
    expect(new CommissionCalculator().calculate(sale, rule({}))).toBe(101);
  });

  it("supports fixed minor-unit amounts", () => {
    expect(new CommissionCalculator().calculate(
      sale, rule({ calculationType: "fixed", rate: null, fixedAmount: 77 }),
    )).toBe(77);
  });

  it("rejects cross-currency calculation", () => {
    expect(() => new CommissionCalculator().calculate(
      sale, rule({ currency: "USD" }),
    )).toThrowError(BusinessNetworkError);
  });
});
