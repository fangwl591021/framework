import type { ModuleBoundary } from "../module-boundary";

export const authorizationBoundary = Object.freeze({
  id: "authorization",
  lifecycle: "Candidate",
  contract: "Approved",
  implementation: "Not Implemented",
  verification: "Not Verified",
  deployment: "Not Deployed",
  dependencies: [],
} satisfies ModuleBoundary);
