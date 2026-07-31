export * from "./models";
export * from "./ports";
export * from "./repository";
export * from "./application";
export * from "./access-guard";
export * from "./manifests";
export * from "./integration";
export const applicationAssemblyContract = {
  id: "application-assembly",
  layer: "Platform Service",
  lifecycle: "Platform Service Candidate",
  contract: "Approved by Tony",
  architectureReview: "Approved",
  securityReview: "Approved",
  implementation: "Locally Implemented",
  verification: "Locally Verified",
  deployment: "Not Deployed",
  productionUse: "Not Allowed",
} as const;
