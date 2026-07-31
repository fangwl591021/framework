import type { NetworkMutationContext } from "./business-network-base";
import type { BusinessNetworkApplication } from "./query-application";

export class CreateNetworkPartnerService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["createNetworkPartner"]>) {
    return this.app.createNetworkPartner(...args);
  }
}
export class UpdateNetworkPartnerStatusService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["updateNetworkPartnerStatus"]>) {
    return this.app.updateNetworkPartnerStatus(...args);
  }
}
export class CreateBusinessRelationshipService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["createBusinessRelationship"]>) {
    return this.app.createBusinessRelationship(...args);
  }
}
export class CloseBusinessRelationshipService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["closeBusinessRelationship"]>) {
    return this.app.closeBusinessRelationship(...args);
  }
}
export class CreateReferralLinkService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["createReferralLink"]>) {
    return this.app.createReferralLink(...args);
  }
}
export class RecordReferralTouchService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["recordReferralTouch"]>) {
    return this.app.recordReferralTouch(...args);
  }
}
export class RecordSaleService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["recordSale"]>) {
    return this.app.recordSale(...args);
  }
}
export class AttributeSaleService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["attributeSale"]>) {
    return this.app.attributeSale(...args);
  }
}
export class CreateCommissionRuleService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["createCommissionRule"]>) {
    return this.app.createCommissionRule(...args);
  }
}
export class CalculateCommissionService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["calculateCommission"]>) {
    return this.app.calculateCommission(...args);
  }
}
export class ApproveCommissionService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["approveCommission"]>) {
    return this.app.approveCommission(...args);
  }
}
export class MarkCommissionPaidService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["markCommissionPaid"]>) {
    return this.app.markCommissionPaid(...args);
  }
}
export class ReverseCommissionService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["reverseCommission"]>) {
    return this.app.reverseCommission(...args);
  }
}
export class CreatePartnerTeamService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["createPartnerTeam"]>) {
    return this.app.createPartnerTeam(...args);
  }
}
export class AddPartnerToTeamService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["addPartnerToTeam"]>) {
    return this.app.addPartnerToTeam(...args);
  }
}
export class GetMyPerformanceService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["getMyPerformance"]>) {
    return this.app.getMyPerformance(...args);
  }
}
export class GetMyCommissionService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["getMyCommission"]>) {
    return this.app.getMyCommission(...args);
  }
}
export class GetMyReferralsService {
  constructor(private readonly app: BusinessNetworkApplication) {}
  execute(...args: Parameters<BusinessNetworkApplication["getMyReferrals"]>) {
    return this.app.getMyReferrals(...args);
  }
}

export type { NetworkMutationContext };
