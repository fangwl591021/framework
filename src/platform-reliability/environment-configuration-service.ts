import type { AuditPort } from "../ports/audit-port";
import { EnvironmentGuard } from "./environment";
import type {
  EnvironmentConfig,
  EnvironmentManifest,
  ReliabilityOperationContext,
  TrustedDeploymentContext,
} from "./models";
import type { IdempotentOperationPort } from "./ports";

export class EnvironmentConfigurationService {
  constructor(
    private readonly idempotency: IdempotentOperationPort,
    private readonly audit: AuditPort,
    private readonly guard = new EnvironmentGuard(),
  ) {}

  async apply(
    manifest: EnvironmentManifest,
    trustedContext: TrustedDeploymentContext,
    context: ReliabilityOperationContext,
  ): Promise<EnvironmentConfig> {
    return this.idempotency.execute(
      "environment.configuration.change",
      context,
      async () => {
        const config = this.guard.load(manifest, trustedContext);
        await this.audit.record({
          action: "environment.configuration.change",
          resourceType: "environment_configuration",
          resourceId: config.environment,
          correlationId: context.correlationId,
        });
        return config;
      },
    );
  }
}
