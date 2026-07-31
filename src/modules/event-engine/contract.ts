export const eventEngineContract = {
  id: "event-engine",
  layer: "Domain Module",
  lifecycle: "Candidate",
  contract: "Approved by Tony",
  implementation: "Locally Implemented",
  verification: "Locally Verified",
  deployment: "Not Deployed",
  productionUse: "Not Allowed",
  dependencies: [
    "identity-core",
    "tenant-access",
    "authorization",
    "core-operations",
  ],
  adapters: [
    "identity-channel",
    "share-target",
    "payment",
    "calendar",
    "notification",
    "qr-token",
  ],
} as const;

export const eventPermissionPolicy = {
  manage: "tenant:update",
  roster: "membership:read",
  checkin: "membership:manage",
  statistics: "tenant:read",
} as const;
