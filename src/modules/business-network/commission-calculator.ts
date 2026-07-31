import { BusinessNetworkError, type CommissionRule, type SaleRecord } from "./models";

export class CommissionCalculator {
  calculate(sale: SaleRecord, rule: CommissionRule): number {
    if (sale.currency !== rule.currency) {
      throw new BusinessNetworkError("COMMISSION_CURRENCY_MISMATCH");
    }
    const amount = rule.calculationType === "fixed"
      ? BigInt(rule.fixedAmount ?? 0)
      : (BigInt(sale.grossAmount) * BigInt(rule.rate ?? 0) + 5000n) / 10000n;
    if (amount < 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RangeError("commission amount is outside the safe integer range");
    }
    return Number(amount);
  }
}
