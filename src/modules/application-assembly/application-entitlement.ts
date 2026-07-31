import type { MutationContext } from "../../application/core-services";
import {
  ApplicationAssemblyError,
  type ApplicationModuleRecord,
} from "./models";
import { errorMessage, nowMs } from "./application-base";
import { ApplicationAdminApplication } from "./application-admin";

export class ApplicationEntitlementApplication extends ApplicationAdminApplication {
  async grantModuleEntitlement(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    moduleKey: string,
    entitlementStatus: "included" | "purchased" | "trial",
    entitlementExpiresAt: number | null,
    context: MutationContext,
  ): Promise<ApplicationModuleRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    const fingerprintInput = {
      tenantId, actorMembershipId, applicationId, moduleKey,
      entitlementStatus, entitlementExpiresAt,
    };
    const replay = await this.replayResult<ApplicationModuleRecord>(
      tenantId, "application.module.entitlement.grant", fingerprintInput, context,
    );
    if (replay) return replay;
    await this.requireApplication(tenantId, applicationId);
    const module = await this.applicationRepository.getModuleByKey(
      tenantId,
      moduleKey,
    );
    if (!module) throw new ApplicationAssemblyError("MODULE_SCOPE_DENIED");
    const timestamp = nowMs(this.clock);
    if (
      (entitlementStatus === "trial"
        && (entitlementExpiresAt === null || entitlementExpiresAt <= timestamp))
      || (entitlementStatus !== "trial" && entitlementExpiresAt !== null)
    ) {
      throw new TypeError("entitlement expiration is invalid");
    }
    const current = await this.applicationRepository.getApplicationModule(
      tenantId,
      applicationId,
      module.id,
    );
    if (
      current
      && current.entitlementStatus !== "expired"
      && current.entitlementStatus !== "revoked"
    ) {
      throw new ApplicationAssemblyError("MODULE_INVALID_STATE");
    }
    const id = current?.id ?? this.uuidv7.generate();
    const version = (current?.version ?? 0) + 1;
    const historyId = this.uuidv7.generate();
    const result = {
      id,
      tenantId,
      applicationId,
      moduleCatalogId: module.id,
      entitlementStatus,
      entitlementExpiresAt,
      enablementStatus: "disabled",
      version,
    } satisfies ApplicationModuleRecord;
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.module.entitlement.grant",
      {
        tenantId,
        actorMembershipId,
        applicationId,
        moduleKey,
        entitlementStatus,
        entitlementExpiresAt,
      },
      context,
      (committedAt) => ({
        result,
        statements: [
          current
            ? this.db
                .prepare(
                  `UPDATE application_modules
                   SET entitlement_status = ?1, entitlement_expires_at = ?2,
                       enablement_status = 'disabled', version = version + 1,
                       updated_at = ?3
                   WHERE tenant_id = ?4 AND id = ?5
                     AND version = ?6
                     AND entitlement_status IN ('expired', 'revoked')`,
                )
                .bind(
                  entitlementStatus,
                  entitlementExpiresAt,
                  committedAt,
                  tenantId,
                  id,
                  current.version,
                )
            : this.db
                .prepare(
                  `INSERT INTO application_modules (
                    id, tenant_id, application_id, module_catalog_id,
                    entitlement_status, entitlement_expires_at,
                    enablement_status, version, created_at, updated_at
                  ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, 'disabled', 1, ?7, ?7
                  )`,
                )
                .bind(
                  id,
                  tenantId,
                  applicationId,
                  module.id,
                  entitlementStatus,
                  entitlementExpiresAt,
                  committedAt,
                ),
          this.db
            .prepare(
              `INSERT INTO module_entitlement_history (
                id, tenant_id, application_module_id, previous_status,
                new_status, application_module_version,
                entitlement_expires_at, reason_code,
                changed_by_membership_id, changed_at, created_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7,
                'ENTITLEMENT_GRANTED', ?8, ?9, ?9
              )`,
            )
            .bind(
              historyId,
              tenantId,
              id,
              current?.entitlementStatus ?? null,
              entitlementStatus,
              version,
              entitlementExpiresAt,
              actorMembershipId,
              committedAt,
            ),
        ],
        audit: {
          action: "application.module.entitlement.grant",
          resourceType: "application_module",
          resourceReference: id,
          reasonCode: "ENTITLEMENT_GRANTED",
        },
      }),
    );
  }

  async revokeModuleEntitlement(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    moduleKey: string,
    finalStatus: "expired" | "revoked",
    context: MutationContext,
  ): Promise<ApplicationModuleRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    const fingerprintInput = {
      tenantId, actorMembershipId, applicationId, moduleKey, finalStatus,
    };
    const replay = await this.replayResult<ApplicationModuleRecord>(
      tenantId, "application.module.entitlement.revoke", fingerprintInput, context,
    );
    if (replay) return replay;
    const module = await this.applicationRepository.getModuleByKey(
      tenantId,
      moduleKey,
    );
    if (!module) throw new ApplicationAssemblyError("MODULE_SCOPE_DENIED");
    const current = await this.applicationRepository.getApplicationModule(
      tenantId,
      applicationId,
      module.id,
    );
    if (
      !current
      || current.entitlementStatus === "expired"
      || current.entitlementStatus === "revoked"
    ) {
      throw new ApplicationAssemblyError("MODULE_INVALID_STATE");
    }
    const version = current.version + 1;
    const result = {
      ...current,
      entitlementStatus: finalStatus,
      enablementStatus: "disabled",
      version,
    } satisfies ApplicationModuleRecord;
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.module.entitlement.revoke",
      { tenantId, actorMembershipId, applicationId, moduleKey, finalStatus },
      context,
      (timestamp) => ({
        result,
        statements: [
          this.db
            .prepare(
              `UPDATE application_modules
               SET entitlement_status = ?1, enablement_status = 'disabled',
                   version = version + 1, updated_at = ?2
               WHERE tenant_id = ?3 AND application_id = ?4
                 AND module_catalog_id = ?5 AND version = ?6
                 AND entitlement_status IN ('included', 'purchased', 'trial')`,
            )
            .bind(
              finalStatus,
              timestamp,
              tenantId,
              applicationId,
              module.id,
              current.version,
            ),
          this.db
            .prepare(
              `INSERT INTO module_entitlement_history (
                id, tenant_id, application_module_id, previous_status,
                new_status, application_module_version,
                entitlement_expires_at, reason_code,
                changed_by_membership_id, changed_at, created_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10
              )`,
            )
            .bind(
              this.uuidv7.generate(),
              tenantId,
              current.id,
              current.entitlementStatus,
              finalStatus,
              version,
              current.entitlementExpiresAt,
              finalStatus === "expired"
                ? "ENTITLEMENT_EXPIRED"
                : "ENTITLEMENT_REVOKED",
              actorMembershipId,
              timestamp,
            ),
        ],
        audit: {
          action: "application.module.entitlement.revoke",
          resourceType: "application_module",
          resourceReference: current.id,
          reasonCode: finalStatus === "expired"
            ? "ENTITLEMENT_EXPIRED"
            : "ENTITLEMENT_REVOKED",
        },
      }),
    );
  }

  async enableModule(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    moduleKey: string,
    context: MutationContext,
  ): Promise<ApplicationModuleRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    const replay = await this.replayResult<ApplicationModuleRecord>(
      tenantId, "application.module.enable",
      { tenantId, actorMembershipId, applicationId, moduleKey }, context,
    );
    if (replay) return replay;
    const snapshot = await this.requireOperationalSnapshot(
      tenantId,
      applicationId,
      moduleKey,
      false,
    );
    if (!snapshot.assignment) {
      throw new ApplicationAssemblyError("MODULE_NOT_ENTITLED");
    }
    if (snapshot.assignment.enablementStatus === "enabled") {
      throw new ApplicationAssemblyError("MODULE_INVALID_STATE");
    }
    const result = {
      ...snapshot.assignment,
      enablementStatus: "enabled",
      version: snapshot.assignment.version + 1,
    } satisfies ApplicationModuleRecord;
    try {
      return await this.executeIdempotent(
        { scopeType: "tenant", tenantId },
        "application.module.enable",
        { tenantId, actorMembershipId, applicationId, moduleKey },
        context,
        (timestamp) => ({
          result,
          statements: [
            this.db
              .prepare(
                `UPDATE application_modules
                 SET enablement_status = 'enabled', version = version + 1,
                     updated_at = ?1
                 WHERE tenant_id = ?2 AND application_id = ?3
                   AND module_catalog_id = ?4
                   AND enablement_status = 'disabled'`,
              )
              .bind(timestamp, tenantId, applicationId, snapshot.module.id),
          ],
          audit: {
            action: "application.module.enable",
            resourceType: "application_module",
            resourceReference: snapshot.assignment?.id as string,
            reasonCode: "ENABLED",
          },
        }),
      );
    } catch (error) {
      const message = errorMessage(error);
      if (message.includes("application_module_dependency_unsatisfied")) {
        throw new ApplicationAssemblyError("MODULE_DEPENDENCY_UNSATISFIED");
      }
      if (message.includes("application_module_enable_guard")) {
        throw new ApplicationAssemblyError("MODULE_NOT_ENTITLED");
      }
      throw error;
    }
  }

  async disableModule(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    moduleKey: string,
    context: MutationContext,
  ): Promise<ApplicationModuleRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    const replay = await this.replayResult<ApplicationModuleRecord>(
      tenantId, "application.module.disable",
      { tenantId, actorMembershipId, applicationId, moduleKey }, context,
    );
    if (replay) return replay;
    const module = await this.applicationRepository.getModuleByKey(
      tenantId,
      moduleKey,
    );
    if (!module) throw new ApplicationAssemblyError("MODULE_SCOPE_DENIED");
    const current = await this.applicationRepository.getApplicationModule(
      tenantId,
      applicationId,
      module.id,
    );
    if (!current || current.enablementStatus !== "enabled") {
      throw new ApplicationAssemblyError("MODULE_INVALID_STATE");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.module.disable",
      { tenantId, actorMembershipId, applicationId, moduleKey },
      context,
      (timestamp) => ({
        result: {
          ...current,
          enablementStatus: "disabled",
          version: current.version + 1,
        },
        statements: [
          this.db
            .prepare(
              `UPDATE application_modules
               SET enablement_status = 'disabled', version = version + 1,
                   updated_at = ?1
               WHERE tenant_id = ?2 AND application_id = ?3
                 AND module_catalog_id = ?4
                 AND enablement_status = 'enabled'`,
            )
            .bind(timestamp, tenantId, applicationId, module.id),
        ],
        audit: {
          action: "application.module.disable",
          resourceType: "application_module",
          resourceReference: current.id,
          reasonCode: "DISABLED",
        },
      }),
    );
  }

}
