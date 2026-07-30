import type { ModuleBoundary } from "../module-boundary";

export const authorizationBoundary = Object.freeze({
  id: "authorization",
  lifecycle: "Candidate",
  contract: "Approved",
  implementation: "Locally Implemented",
  verification: "Locally Verified",
  deployment: "Not Deployed",
  dependencies: [],
} satisfies ModuleBoundary);
