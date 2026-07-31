import {
  type EnvironmentConfig,
  type EnvironmentManifest,
  type EnvironmentName,
  ReliabilityError,
  type TrustedDeploymentContext,
} from "./models";

const SAFE_REFERENCE = /^[a-z0-9][a-z0-9._:/-]{2,127}$/;

export const defaultEnvironmentManifest: EnvironmentManifest = Object.freeze({
  version: 1,
  environments: Object.freeze([
    Object.freeze({
      environment: "development",
      d1DatabaseReference: "logical:d1/platform-core-development",
      secretProviderReference: "logical:secrets/platform-core-development",
      releaseChannel: "development",
    }),
    Object.freeze({
      environment: "staging",
      d1DatabaseReference: "logical:d1/platform-core-staging",
      secretProviderReference: "logical:secrets/platform-core-staging",
      releaseChannel: "staging",
    }),
    Object.freeze({
      environment: "production",
      d1DatabaseReference: "logical:d1/platform-core-production",
      secretProviderReference: "logical:secrets/platform-core-production",
      releaseChannel: "production-approved",
    }),
  ]),
});

export class EnvironmentGuard {
  validateManifest(manifest: EnvironmentManifest): void {
    if (manifest.version !== 1 || manifest.environments.length !== 3) {
      throw new ReliabilityError("INVALID_ENVIRONMENT_CONFIGURATION");
    }
    const names = new Set<EnvironmentName>();
    const databaseReferences = new Set<string>();
    const secretReferences = new Set<string>();
    for (const config of manifest.environments) {
      if (
        names.has(config.environment)
        || databaseReferences.has(config.d1DatabaseReference)
        || secretReferences.has(config.secretProviderReference)
        || !SAFE_REFERENCE.test(config.d1DatabaseReference)
        || !SAFE_REFERENCE.test(config.secretProviderReference)
        || !SAFE_REFERENCE.test(config.releaseChannel)
      ) {
        throw new ReliabilityError("INVALID_ENVIRONMENT_CONFIGURATION");
      }
      names.add(config.environment);
      databaseReferences.add(config.d1DatabaseReference);
      secretReferences.add(config.secretProviderReference);
    }
    if (!["development", "staging", "production"].every(
      (name) => names.has(name as EnvironmentName),
    )) {
      throw new ReliabilityError("INVALID_ENVIRONMENT_CONFIGURATION");
    }
  }

  load(
    manifest: EnvironmentManifest,
    trustedContext: TrustedDeploymentContext,
  ): EnvironmentConfig {
    this.validateManifest(manifest);
    if (trustedContext.source !== "deployment_configuration") {
      throw new ReliabilityError("ENVIRONMENT_BOUNDARY_VIOLATION");
    }
    const config = manifest.environments.find(
      ({ environment }) => environment === trustedContext.target,
    );
    if (!config) {
      throw new ReliabilityError("INVALID_ENVIRONMENT_CONFIGURATION");
    }
    return config;
  }

  assertPromotion(source: EnvironmentName, target: EnvironmentName): void {
    const allowed =
      (source === "development" && target === "staging")
      || (source === "staging" && target === "production");
    if (!allowed) {
      throw new ReliabilityError("ENVIRONMENT_BOUNDARY_VIOLATION");
    }
  }
}
