import type { MutationContext } from "../../application/core-services";
import { PlatformCoreApplication } from "../../application/core-services";
import type { Clock } from "../../core/clock";
import type { UuidV7 } from "../../core/uuidv7";
import type { IdentityDigestKeyProvider } from "../../persistence/crypto";
import { requestFingerprint, sha256Hex } from "../../persistence/crypto";
import { DomainConflictError, TenantBoundaryError } from "../../persistence/models";
import {
  ApplicationAssemblyError,
  type ApplicationConfigurationRecord,
  type ApplicationDashboard,
  type ApplicationDashboardModule,
  type ApplicationModuleRecord,
  type ApplicationNavigationItem,
  type ApplicationRecord,
  type ModuleAccessDecision,
  type ModuleCatalogRecord,
  type ModuleEntitlementStatus,
  type RegisterModuleInput,
} from "./models";
import {
  ApplicationAssemblyRepository,
  type ModuleAccessSnapshot,
  type ModuleDependencyRecord,
} from "./repository";

export const TRUSTED_APPLICATION_CONTEXT = Symbol("trusted-application-context");
const MANAGE_PERMISSION = "tenant:update";
export const MAX_NAVIGATION_ITEMS = 100;
const SAFE_KEY = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;
const SLUG_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
export const SECRET_KEY = /(secret|token|password|credential|private[_-]?key)/iu;

export function nowMs(clock: Clock): number {
  return clock.now().getTime();
}

export function isValidEntitlement(
  assignment: ApplicationModuleRecord | null,
  timestamp: number,
): boolean {
  if (!assignment) return false;
  if (
    assignment.entitlementStatus === "included"
    || assignment.entitlementStatus === "purchased"
  ) {
    return true;
  }
  return (
    assignment.entitlementStatus === "trial"
    && assignment.entitlementExpiresAt !== null
    && assignment.entitlementExpiresAt > timestamp
  );
}

export function valueType(
  value: unknown,
): ApplicationConfigurationRecord["valueType"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  if (typeof value === "string") return "string";
  return "json";
}

export function containsSecretShape(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsSecretShape);
  return Object.entries(value).some(
    ([key, nested]) => SECRET_KEY.test(key) || containsSecretShape(nested),
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class ApplicationAssemblyBase extends PlatformCoreApplication {
  readonly applicationRepository: ApplicationAssemblyRepository;

  constructor(
    db: D1Database,
    clock: Clock,
    uuidv7: UuidV7,
    identityKeys: IdentityDigestKeyProvider,
  ) {
    super(db, clock, uuidv7, identityKeys);
    this.applicationRepository = new ApplicationAssemblyRepository(db);
  }

  protected async replayResult<T>(
    tenantId: string,
    operation: string,
    fingerprintInput: unknown,
    context: MutationContext,
  ): Promise<T | null> {
    const keyHash = await sha256Hex(context.idempotencyKey);
    const fingerprint = await requestFingerprint(fingerprintInput);
    const existing = await this.repositories.idempotency.findTenant(
      tenantId, operation, keyHash,
    );
    if (!existing) return null;
    if (existing.requestFingerprint !== fingerprint) {
      throw new DomainConflictError("IDEMPOTENCY_CONFLICT");
    }
    if (existing.status === "completed" && existing.storedResultJson) {
      return JSON.parse(existing.storedResultJson) as T;
    }
    return null;
  }

  protected validateSlugKey(name: string, value: string, max = 80): void {
    if (!SLUG_KEY.test(value) || value.length > max) {
      throw new TypeError(`${name} is invalid`);
    }
  }

  protected validateKey(name: string, value: string, max = 80): void {
    if (!SAFE_KEY.test(value) || value.length > max) {
      throw new TypeError(`${name} is invalid`);
    }
  }

  protected async requireManagePermission(
    tenantId: string,
    membershipId: string,
  ): Promise<void> {
    const tenant = await this.repositories.tenants.getById(tenantId);
    if (!tenant) throw new TenantBoundaryError();
    if (
      tenant.status !== "active"
      || !(await this.checkPermission(tenantId, membershipId, MANAGE_PERMISSION))
    ) {
      throw new ApplicationAssemblyError("MODULE_PERMISSION_DENIED");
    }
  }

  protected async requireApplication(
    tenantId: string,
    applicationId: string,
  ): Promise<ApplicationRecord> {
    const application = await this.applicationRepository.getApplication(
      tenantId,
      applicationId,
    );
    if (!application) {
      throw new ApplicationAssemblyError("APPLICATION_SCOPE_DENIED");
    }
    return application;
  }

  protected validateManifest(input: RegisterModuleInput): string {
    if (
      input.navigationManifest.items.length === 0
      || input.navigationManifest.items.length > 20
    ) {
      throw new TypeError("navigation manifest size is invalid");
    }
    const keys = new Set<string>();
    for (const item of input.navigationManifest.items) {
      this.validateKey("navigation item key", item.itemKey, 80);
      if (keys.has(item.itemKey)) {
        throw new TypeError("navigation item key is duplicated");
      }
      keys.add(item.itemKey);
      if (!item.label.trim() || item.label.length > 80) {
        throw new TypeError("navigation label is invalid");
      }
      if (
        !item.path.startsWith("/")
        || item.path.length > 200
        || item.path.includes("://")
      ) {
        throw new TypeError("navigation path is invalid");
      }
    }
    const serialized = JSON.stringify(input.navigationManifest);
    if (serialized.length > 8192) {
      throw new TypeError("navigation manifest is too large");
    }
    return serialized;
  }

  protected evaluateSnapshot(
    snapshot: ModuleAccessSnapshot,
    timestamp: number,
  ): ModuleAccessDecision {
    const base = {
      applicationId: snapshot.application.id,
      moduleKey: snapshot.module.moduleKey,
    };
    if (snapshot.application.status !== "active") {
      return { ...base, allowed: false, reason: "APPLICATION_NOT_ACTIVE" };
    }
    if (snapshot.module.availabilityStatus !== "available") {
      return { ...base, allowed: false, reason: "MODULE_NOT_AVAILABLE" };
    }
    if (!isValidEntitlement(snapshot.assignment, timestamp)) {
      return { ...base, allowed: false, reason: "MODULE_NOT_ENTITLED" };
    }
    if (snapshot.assignment?.enablementStatus !== "enabled") {
      return { ...base, allowed: false, reason: "MODULE_NOT_ENABLED" };
    }
    if (!snapshot.dependenciesSatisfied) {
      return {
        ...base,
        allowed: false,
        reason: "MODULE_DEPENDENCY_UNSATISFIED",
      };
    }
    return { ...base, allowed: true, reason: "ALLOWED" };
  }

  protected async requireOperationalSnapshot(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    requireEnabled: boolean,
  ): Promise<ModuleAccessSnapshot> {
    const timestamp = nowMs(this.clock);
    const snapshot = await this.applicationRepository.getAccessSnapshot(
      tenantId,
      applicationId,
      moduleKey,
      timestamp,
    );
    if (!snapshot) {
      throw new ApplicationAssemblyError("APPLICATION_SCOPE_DENIED");
    }
    if (snapshot.application.status !== "active") {
      throw new ApplicationAssemblyError("APPLICATION_INVALID_STATE");
    }
    if (snapshot.module.availabilityStatus !== "available") {
      throw new ApplicationAssemblyError("MODULE_NOT_AVAILABLE");
    }
    if (!isValidEntitlement(snapshot.assignment, timestamp)) {
      throw new ApplicationAssemblyError("MODULE_NOT_ENTITLED");
    }
    if (!snapshot.dependenciesSatisfied) {
      throw new ApplicationAssemblyError("MODULE_DEPENDENCY_UNSATISFIED");
    }
    if (
      requireEnabled
      && snapshot.assignment?.enablementStatus !== "enabled"
    ) {
      throw new ApplicationAssemblyError("MODULE_NOT_ENABLED");
    }
    return snapshot;
  }

}
