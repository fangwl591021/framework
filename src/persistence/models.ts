export type PlatformUserStatus = "active" | "suspended" | "merged" | "anonymized";
export type TenantStatus = "active" | "suspended";
export type MembershipStatus = "active" | "suspended" | "closed" | "merged";

export interface PlatformUser {
  readonly id: string;
  readonly status: PlatformUserStatus;
  readonly mergedIntoUserId: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly anonymizedAt: number | null;
}

export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly status: TenantStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface IdentityMapping {
  readonly id: string;
  readonly platformUserId: string;
  readonly provider: string;
  readonly issuerContext: string;
  readonly subjectDigest: string;
  readonly digestKeyVersion: number;
  readonly status: "active" | "revoked" | "conflict";
}

export interface TenantMembership {
  readonly id: string;
  readonly tenantId: string;
  readonly platformUserId: string;
  readonly status: MembershipStatus;
  readonly joinSource: string;
}

export interface Permission {
  readonly id: string;
  readonly permissionKey: string;
  readonly status: "active" | "deprecated";
}

export interface Role {
  readonly id: string;
  readonly scopeType: "core" | "tenant";
  readonly tenantId: string | null;
  readonly tenantScopeKey: string;
  readonly roleKey: string;
  readonly name: string;
  readonly systemManaged: boolean;
  readonly status: "active" | "deprecated" | "archived";
}

export interface RoleAssignment {
  readonly id: string;
  readonly tenantId: string;
  readonly tenantMembershipId: string;
  readonly roleId: string;
  readonly roleScopeKey: string;
  readonly status: "active" | "revoked";
}

export interface AuditRecord {
  readonly id: string;
  readonly scopeType: "platform" | "tenant";
  readonly tenantId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceReference: string;
  readonly decision: "changed" | "denied";
  readonly reasonCode: string;
  readonly occurredAt: number;
}

export interface IdempotencyRecord {
  readonly id: string;
  readonly scopeType: "platform" | "tenant";
  readonly tenantId: string | null;
  readonly operation: string;
  readonly idempotencyKeyHash: string;
  readonly requestFingerprint: string;
  readonly status: "processing" | "completed" | "failed";
  readonly storedResultJson: string | null;
  readonly generation: number;
  readonly leaseExpiresAt: number | null;
}

export class DomainConflictError extends Error {
  constructor(
    readonly code:
      | "IDEMPOTENCY_CONFLICT"
      | "IDEMPOTENCY_IN_PROGRESS"
      | "IDENTITY_ALREADY_LINKED"
      | "LIFECYCLE_CONFLICT"
      | "LAST_TENANT_OWNER"
      | "DUPLICATE_ACTIVE_RECORD",
  ) {
    super(code);
    this.name = "DomainConflictError";
  }
}

export class DomainNotFoundError extends Error {
  constructor(readonly resource: string) {
    super(`${resource} not found`);
    this.name = "DomainNotFoundError";
  }
}

export class TenantBoundaryError extends Error {
  readonly code = "TENANT_BOUNDARY_VIOLATION";

  constructor() {
    super("Tenant-scoped resource is unavailable");
    this.name = "TenantBoundaryError";
  }
}
