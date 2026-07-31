import type { MutationContext } from "../../application/core-services";
import {
  ApplicationAssemblyError,
  type ApplicationConfigurationRecord,
} from "./models";
import {
  SECRET_KEY,
  containsSecretShape,
  valueType,
} from "./application-base";
import { ApplicationAccessApplication } from "./application-access";

export class ApplicationConfigurationApplication extends ApplicationAccessApplication {
  async setApplicationConfiguration(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    configurationKey: string,
    value: unknown,
    context: MutationContext,
  ): Promise<ApplicationConfigurationRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    await this.requireApplication(tenantId, applicationId);
    this.validateKey("configuration key", configurationKey, 120);
    if (SECRET_KEY.test(configurationKey) || containsSecretShape(value)) {
      throw new ApplicationAssemblyError("CONFIGURATION_SECRET_FORBIDDEN");
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TypeError("configuration value is invalid");
    }
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > 4096) {
      throw new TypeError("configuration value is invalid");
    }
    const canonicalValue = JSON.parse(serialized) as unknown;
    const current = await this.applicationRepository.getActiveConfiguration(
      tenantId,
      applicationId,
      configurationKey,
    );
    const id = this.uuidv7.generate();
    const type = valueType(canonicalValue);
    const result = {
      id,
      tenantId,
      applicationId,
      configurationKey,
      valueType: type,
      value: canonicalValue,
      status: "active",
      version: (current?.version ?? 0) + 1,
    } satisfies ApplicationConfigurationRecord;
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.configuration.set",
      { tenantId, actorMembershipId, applicationId, configurationKey, value },
      context,
      (timestamp) => ({
        result,
        statements: [
          ...(current
            ? [
                this.db
                  .prepare(
                    `UPDATE application_configuration
                     SET status = 'archived', archived_at = ?1,
                         updated_at = ?1
                     WHERE tenant_id = ?2 AND id = ?3 AND status = 'active'`,
                  )
                  .bind(timestamp, tenantId, current.id),
              ]
            : []),
          this.db
            .prepare(
              `INSERT INTO application_configuration (
                id, tenant_id, application_id, configuration_key,
                value_type, value_json, status, version,
                created_at, updated_at, archived_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?8, ?8, NULL
              )`,
            )
            .bind(
              id,
              tenantId,
              applicationId,
              configurationKey,
              type,
              serialized,
              result.version,
              timestamp,
            ),
        ],
        audit: {
          action: "application.configuration.set",
          resourceType: "application_configuration",
          resourceReference: `${applicationId}:${configurationKey}`,
          reasonCode: "CONFIGURATION_SET",
        },
      }),
    );
  }}
