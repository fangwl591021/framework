import type { ModuleBoundary } from "../module-boundary";

export const identityCoreBoundary = Object.freeze({
  id: "identity-core",
  lifecycle: "Candidate",
  contract: "Approved",
  implementation: "Locally Implemented",
  verification: "Locally Verified",
  deployment: "Not Deployed",
  dependencies: [],
} satisfies ModuleBoundary);
