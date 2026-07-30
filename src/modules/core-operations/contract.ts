import type { ModuleBoundary } from "../module-boundary";

export const coreOperationsBoundary = Object.freeze({
  id: "core-operations",
  lifecycle: "Candidate",
  contract: "Approved",
  implementation: "Locally Implemented",
  verification: "Locally Verified",
  deployment: "Not Deployed",
  dependencies: [],
} satisfies ModuleBoundary);
