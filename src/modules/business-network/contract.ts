export const businessNetworkPermissions = {
  networkRead: "network:read",
  networkManage: "network:manage",
  referralRead: "referral:read",
  referralManage: "referral:manage",
  salesRead: "sales:read",
  salesManage: "sales:manage",
  commissionReadSelf: "commission:read_self",
  commissionReadAll: "commission:read_all",
  commissionManage: "commission:manage",
  teamRead: "team:read",
  teamManage: "team:manage",
} as const;

export const businessNetworkContract = {
  id: "business-network-engine",
  displayName: "Business Network Engine",
  layer: "Domain Module",
  lifecycle: "Candidate",
  contract: "Proposed / Pending Tony Approval",
  implementation: "Locally Implemented",
  verification: "Locally Verified",
  deployment: "Not Deployed",
  productionUse: "Not Allowed",
  dependencies: ["identity-core", "tenant-access", "authorization", "core-operations"],
} as const;
