export * from "./models";
export * from "./registry";
export * from "./resolver";
export * from "./slots";
export * from "./ports";
export * from "./repository";
export * from "./router";
export * from "./adapters";
export * from "./application";

export const conversationalWorkbenchContract = {
  id: "conversational-workbench",
  layer: "Experience Platform Service",
  lifecycle: "Experience Platform Service Candidate",
  contract: "Approved by Tony",
  architectureReview: "Approved",
  securityReview: "Approved",
  implementation: "Locally Implemented",
  verification: "Locally Verified",
  deployment: "Not Deployed",
  productionUse: "Not Allowed",
  aiResolver: "Disabled",
} as const;
