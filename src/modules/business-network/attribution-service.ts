import { BusinessNetworkError, type ReferralTouch, type SaleRecord } from "./models";
import type { BusinessNetworkRepository } from "./repository";

export class AttributionService {
  constructor(private readonly repository: BusinessNetworkRepository) {}

  async firstValidTouch(tenantId: string, sale: SaleRecord): Promise<ReferralTouch> {
    const touch = await this.repository.findFirstValidTouch(
      tenantId, sale.buyerReference, sale.occurredAt,
    );
    if (!touch) throw new BusinessNetworkError("ATTRIBUTION_NOT_AVAILABLE");
    return touch;
  }
}
