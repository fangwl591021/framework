import type {
  AuditRecord,
  IdentityMapping,
  IdempotencyRecord,
  Permission,
  PlatformUser,
  Role,
  RoleAssignment,
  Tenant,
  TenantMembership,
} from "./models";

type PlatformUserRow = {
  id: string;
  status: PlatformUser["status"];
  merged_into_user_id: string | null;
  created_at: number;
  updated_at: number;
  anonymized_at: number | null;
};

type TenantRow = {
  id: string;
  name: string;
  status: Tenant["status"];
  created_at: number;
  updated_at: number;
};

type IdentityMappingRow = {
  id: string;
  platform_user_id: string;
  provider: string;
  issuer_context: string;
  subject_digest: string;
  digest_key_version: number;
  status: IdentityMapping["status"];
};

type MembershipRow = {
  id: string;
  tenant_id: string;
  platform_user_id: string;
  status: TenantMembership["status"];
  join_source: string;
};

type PermissionRow = {
  id: string;
  permission_key: string;
  status: Permission["status"];
};

type RoleRow = {
  id: string;
  scope_type: Role["scopeType"];
  tenant_id: string | null;
  tenant_scope_key: string;
  role_key: string;
  name: string;
  system_managed: number;
  status: Role["status"];
};

type RoleAssignmentRow = {
  id: string;
  tenant_id: string;
  tenant_membership_id: string;
  role_id: string;
  role_scope_key: string;
  status: RoleAssignment["status"];
};

type IdempotencyRow = {
  id: string;
  scope_type: IdempotencyRecord["scopeType"];
  tenant_id: string | null;
  operation: string;
  idempotency_key_hash: string;
  request_fingerprint: string;
  status: IdempotencyRecord["status"];
  stored_result_json: string | null;
  generation: number;
  lease_expires_at: number | null;
};

type AuditRow = {
  id: string;
  scope_type: AuditRecord["scopeType"];
  tenant_id: string | null;
  action: string;
  resource_type: string;
  resource_reference: string;
  decision: AuditRecord["decision"];
  reason_code: string;
  occurred_at: number;
};

function platformUser(row: PlatformUserRow): PlatformUser {
  return {
    id: row.id,
    status: row.status,
    mergedIntoUserId: row.merged_into_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    anonymizedAt: row.anonymized_at,
  };
}

function tenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function identityMapping(row: IdentityMappingRow): IdentityMapping {
  return {
    id: row.id,
    platformUserId: row.platform_user_id,
    provider: row.provider,
    issuerContext: row.issuer_context,
    subjectDigest: row.subject_digest,
    digestKeyVersion: row.digest_key_version,
    status: row.status,
  };
}

function membership(row: MembershipRow): TenantMembership {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    platformUserId: row.platform_user_id,
    status: row.status,
    joinSource: row.join_source,
  };
}

function permission(row: PermissionRow): Permission {
  return {
    id: row.id,
    permissionKey: row.permission_key,
    status: row.status,
  };
}

function role(row: RoleRow): Role {
  return {
    id: row.id,
    scopeType: row.scope_type,
    tenantId: row.tenant_id,
    tenantScopeKey: row.tenant_scope_key,
    roleKey: row.role_key,
    name: row.name,
    systemManaged: row.system_managed === 1,
    status: row.status,
  };
}

function assignment(row: RoleAssignmentRow): RoleAssignment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantMembershipId: row.tenant_membership_id,
    roleId: row.role_id,
    roleScopeKey: row.role_scope_key,
    status: row.status,
  };
}

function idempotency(row: IdempotencyRow): IdempotencyRecord {
  return {
    id: row.id,
    scopeType: row.scope_type,
    tenantId: row.tenant_id,
    operation: row.operation,
    idempotencyKeyHash: row.idempotency_key_hash,
    requestFingerprint: row.request_fingerprint,
    status: row.status,
    storedResultJson: row.stored_result_json,
    generation: row.generation,
    leaseExpiresAt: row.lease_expires_at,
  };
}

export interface PlatformUserRepository {
  getById(id: string): Promise<PlatformUser | null>;
}

export interface TenantRepository {
  getById(tenantId: string): Promise<Tenant | null>;
}

export interface IdentityMappingRepository {
  findActive(
    provider: string,
    issuerContext: string,
    subjectDigest: string,
  ): Promise<IdentityMapping | null>;
  listActiveForUser(platformUserId: string): Promise<readonly IdentityMapping[]>;
}

export interface TenantMembershipRepository {
  getById(tenantId: string, membershipId: string): Promise<TenantMembership | null>;
  list(tenantId: string, limit?: number): Promise<readonly TenantMembership[]>;
}

export interface PermissionRepository {
  getByKey(permissionKey: string): Promise<Permission | null>;
}

export interface RoleRepository {
  getCoreByKey(roleKey: string): Promise<Role | null>;
  getTenantByKey(tenantId: string, roleKey: string): Promise<Role | null>;
  getByIdForTenant(tenantId: string, roleId: string): Promise<Role | null>;
}

export interface RoleAssignmentRepository {
  getById(tenantId: string, assignmentId: string): Promise<RoleAssignment | null>;
  listForMember(
    tenantId: string,
    membershipId: string,
  ): Promise<readonly RoleAssignment[]>;
  hasPermission(
    tenantId: string,
    membershipId: string,
    permissionKey: string,
  ): Promise<boolean>;
  listPermissionKeys(
    tenantId: string,
    membershipId: string,
  ): Promise<readonly string[]>;
}

export interface IdempotencyRepository {
  findPlatform(operation: string, keyHash: string): Promise<IdempotencyRecord | null>;
  findTenant(
    tenantId: string,
    operation: string,
    keyHash: string,
  ): Promise<IdempotencyRecord | null>;
}

export interface AuditRepository {
  listForTenant(tenantId: string, limit?: number): Promise<readonly AuditRecord[]>;
  listPlatform(limit?: number): Promise<readonly AuditRecord[]>;
}

export class D1PlatformUserRepository implements PlatformUserRepository {
  constructor(private readonly db: D1Database) {}

  async getById(id: string): Promise<PlatformUser | null> {
    const row = await this.db
      .prepare(
        `SELECT id, status, merged_into_user_id, created_at, updated_at, anonymized_at
         FROM platform_users WHERE id = ?1`,
      )
      .bind(id)
      .first<PlatformUserRow>();
    return row ? platformUser(row) : null;
  }
}

export class D1TenantRepository implements TenantRepository {
  constructor(private readonly db: D1Database) {}

  async getById(tenantId: string): Promise<Tenant | null> {
    const row = await this.db
      .prepare(
        `SELECT id, name, status, created_at, updated_at
         FROM tenants WHERE id = ?1`,
      )
      .bind(tenantId)
      .first<TenantRow>();
    return row ? tenant(row) : null;
  }
}

export class D1IdentityMappingRepository implements IdentityMappingRepository {
  constructor(private readonly db: D1Database) {}

  async findActive(
    provider: string,
    issuerContext: string,
    subjectDigest: string,
  ): Promise<IdentityMapping | null> {
    const row = await this.db
      .prepare(
        `SELECT id, platform_user_id, provider, issuer_context, subject_digest,
                digest_key_version, status
         FROM identity_mappings
         WHERE provider = ?1 AND issuer_context = ?2
           AND subject_digest = ?3 AND status = 'active'`,
      )
      .bind(provider, issuerContext, subjectDigest)
      .first<IdentityMappingRow>();
    return row ? identityMapping(row) : null;
  }

  async listActiveForUser(
    platformUserId: string,
  ): Promise<readonly IdentityMapping[]> {
    const result = await this.db
      .prepare(
        `SELECT id, platform_user_id, provider, issuer_context, subject_digest,
                digest_key_version, status
         FROM identity_mappings
         WHERE platform_user_id = ?1 AND status = 'active'
         ORDER BY id LIMIT 100`,
      )
      .bind(platformUserId)
      .all<IdentityMappingRow>();
    return result.results.map(identityMapping);
  }
}

export class D1TenantMembershipRepository
  implements TenantMembershipRepository
{
  constructor(private readonly db: D1Database) {}

  async getById(
    tenantId: string,
    membershipId: string,
  ): Promise<TenantMembership | null> {
    const row = await this.db
      .prepare(
        `SELECT id, tenant_id, platform_user_id, status, join_source
         FROM tenant_memberships
         WHERE tenant_id = ?1 AND id = ?2`,
      )
      .bind(tenantId, membershipId)
      .first<MembershipRow>();
    return row ? membership(row) : null;
  }

  async list(
    tenantId: string,
    limit = 100,
  ): Promise<readonly TenantMembership[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const result = await this.db
      .prepare(
        `SELECT id, tenant_id, platform_user_id, status, join_source
         FROM tenant_memberships
         WHERE tenant_id = ?1
         ORDER BY id LIMIT ?2`,
      )
      .bind(tenantId, safeLimit)
      .all<MembershipRow>();
    return result.results.map(membership);
  }
}

export class D1PermissionRepository implements PermissionRepository {
  constructor(private readonly db: D1Database) {}

  async getByKey(permissionKey: string): Promise<Permission | null> {
    const row = await this.db
      .prepare(
        `SELECT id, permission_key, status
         FROM permissions WHERE permission_key = ?1`,
      )
      .bind(permissionKey)
      .first<PermissionRow>();
    return row ? permission(row) : null;
  }
}

export class D1RoleRepository implements RoleRepository {
  constructor(private readonly db: D1Database) {}

  async getCoreByKey(roleKey: string): Promise<Role | null> {
    const row = await this.db
      .prepare(
        `SELECT id, scope_type, tenant_id, tenant_scope_key, role_key, name,
                system_managed, status
         FROM roles
         WHERE scope_type = 'core' AND role_key = ?1`,
      )
      .bind(roleKey)
      .first<RoleRow>();
    return row ? role(row) : null;
  }

  async getTenantByKey(tenantId: string, roleKey: string): Promise<Role | null> {
    const row = await this.db
      .prepare(
        `SELECT id, scope_type, tenant_id, tenant_scope_key, role_key, name,
                system_managed, status
         FROM roles
         WHERE tenant_id = ?1 AND scope_type = 'tenant' AND role_key = ?2`,
      )
      .bind(tenantId, roleKey)
      .first<RoleRow>();
    return row ? role(row) : null;
  }

  async getByIdForTenant(tenantId: string, roleId: string): Promise<Role | null> {
    const row = await this.db
      .prepare(
        `SELECT id, scope_type, tenant_id, tenant_scope_key, role_key, name,
                system_managed, status
         FROM roles
         WHERE id = ?2 AND (tenant_scope_key = 'core' OR tenant_scope_key = 'tenant:' || ?1)`,
      )
      .bind(tenantId, roleId)
      .first<RoleRow>();
    return row ? role(row) : null;
  }
}

export class D1RoleAssignmentRepository
  implements RoleAssignmentRepository
{
  constructor(private readonly db: D1Database) {}

  async getById(
    tenantId: string,
    assignmentId: string,
  ): Promise<RoleAssignment | null> {
    const row = await this.db
      .prepare(
        `SELECT id, tenant_id, tenant_membership_id, role_id, role_scope_key, status
         FROM role_assignments
         WHERE tenant_id = ?1 AND id = ?2`,
      )
      .bind(tenantId, assignmentId)
      .first<RoleAssignmentRow>();
    return row ? assignment(row) : null;
  }

  async listForMember(
    tenantId: string,
    membershipId: string,
  ): Promise<readonly RoleAssignment[]> {
    const result = await this.db
      .prepare(
        `SELECT id, tenant_id, tenant_membership_id, role_id, role_scope_key, status
         FROM role_assignments
         WHERE tenant_id = ?1 AND tenant_membership_id = ?2
         ORDER BY id LIMIT 100`,
      )
      .bind(tenantId, membershipId)
      .all<RoleAssignmentRow>();
    return result.results.map(assignment);
  }

  async hasPermission(
    tenantId: string,
    membershipId: string,
    permissionKey: string,
  ): Promise<boolean> {
    const row = await this.db
      .prepare(
        `SELECT 1 AS allowed
         FROM role_assignments AS assignment
         JOIN tenant_memberships AS member
           ON member.tenant_id = assignment.tenant_id
          AND member.id = assignment.tenant_membership_id
         JOIN roles AS role
           ON role.tenant_scope_key = assignment.role_scope_key
          AND role.id = assignment.role_id
         JOIN role_permissions AS mapping
           ON mapping.tenant_scope_key = role.tenant_scope_key
          AND mapping.role_id = role.id
         JOIN permissions AS permission ON permission.id = mapping.permission_id
         WHERE assignment.tenant_id = ?1
           AND assignment.tenant_membership_id = ?2
           AND assignment.status = 'active'
           AND member.status = 'active'
           AND role.status = 'active'
           AND permission.status = 'active'
           AND permission.permission_key = ?3
         LIMIT 1`,
      )
      .bind(tenantId, membershipId, permissionKey)
      .first<{ allowed: number }>();
    return row?.allowed === 1;
  }

  async listPermissionKeys(
    tenantId: string,
    membershipId: string,
  ): Promise<readonly string[]> {
    const result = await this.db
      .prepare(
        `SELECT DISTINCT permission.permission_key
         FROM role_assignments AS assignment
         JOIN tenant_memberships AS member
           ON member.tenant_id = assignment.tenant_id
          AND member.id = assignment.tenant_membership_id
         JOIN roles AS role
           ON role.tenant_scope_key = assignment.role_scope_key
          AND role.id = assignment.role_id
         JOIN role_permissions AS mapping
           ON mapping.tenant_scope_key = role.tenant_scope_key
          AND mapping.role_id = role.id
         JOIN permissions AS permission ON permission.id = mapping.permission_id
         WHERE assignment.tenant_id = ?1
           AND assignment.tenant_membership_id = ?2
           AND assignment.status = 'active'
           AND member.status = 'active'
           AND role.status = 'active'
           AND permission.status = 'active'
         ORDER BY permission.permission_key
         LIMIT 100`,
      )
      .bind(tenantId, membershipId)
      .all<{ permission_key: string }>();
    return result.results.map(({ permission_key }) => permission_key);
  }
}

export class D1IdempotencyRepository implements IdempotencyRepository {
  constructor(private readonly db: D1Database) {}

  async findPlatform(
    operation: string,
    keyHash: string,
  ): Promise<IdempotencyRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, scope_type, tenant_id, operation, idempotency_key_hash,
                request_fingerprint, status, stored_result_json, generation,
                lease_expires_at
         FROM idempotency_records
         WHERE scope_type = 'platform' AND operation = ?1
           AND idempotency_key_hash = ?2`,
      )
      .bind(operation, keyHash)
      .first<IdempotencyRow>();
    return row ? idempotency(row) : null;
  }

  async findTenant(
    tenantId: string,
    operation: string,
    keyHash: string,
  ): Promise<IdempotencyRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, scope_type, tenant_id, operation, idempotency_key_hash,
                request_fingerprint, status, stored_result_json, generation,
                lease_expires_at
         FROM idempotency_records
         WHERE scope_type = 'tenant' AND tenant_id = ?1
           AND operation = ?2 AND idempotency_key_hash = ?3`,
      )
      .bind(tenantId, operation, keyHash)
      .first<IdempotencyRow>();
    return row ? idempotency(row) : null;
  }
}

export class D1AuditRepository implements AuditRepository {
  constructor(private readonly db: D1Database) {}

  async listForTenant(
    tenantId: string,
    limit = 100,
  ): Promise<readonly AuditRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const result = await this.db
      .prepare(
        `SELECT id, scope_type, tenant_id, action, resource_type,
                resource_reference, decision, reason_code, occurred_at
         FROM audit_records
         WHERE tenant_id = ?1
         ORDER BY occurred_at DESC, id DESC LIMIT ?2`,
      )
      .bind(tenantId, safeLimit)
      .all<AuditRow>();
    return result.results.map((row) => ({
      id: row.id,
      scopeType: row.scope_type,
      tenantId: row.tenant_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceReference: row.resource_reference,
      decision: row.decision,
      reasonCode: row.reason_code,
      occurredAt: row.occurred_at,
    }));
  }

  async listPlatform(limit = 100): Promise<readonly AuditRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const result = await this.db
      .prepare(
        `SELECT id, scope_type, tenant_id, action, resource_type,
                resource_reference, decision, reason_code, occurred_at
         FROM audit_records
         WHERE scope_type = 'platform'
         ORDER BY occurred_at DESC, id DESC LIMIT ?1`,
      )
      .bind(safeLimit)
      .all<AuditRow>();
    return result.results.map((row) => ({
      id: row.id,
      scopeType: row.scope_type,
      tenantId: row.tenant_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceReference: row.resource_reference,
      decision: row.decision,
      reasonCode: row.reason_code,
      occurredAt: row.occurred_at,
    }));
  }
}

export interface CoreRepositories {
  readonly platformUsers: PlatformUserRepository;
  readonly tenants: TenantRepository;
  readonly identities: IdentityMappingRepository;
  readonly memberships: TenantMembershipRepository;
  readonly permissions: PermissionRepository;
  readonly roles: RoleRepository;
  readonly roleAssignments: RoleAssignmentRepository;
  readonly idempotency: IdempotencyRepository;
  readonly audit: AuditRepository;
}

export function createD1Repositories(db: D1Database): CoreRepositories {
  return {
    platformUsers: new D1PlatformUserRepository(db),
    tenants: new D1TenantRepository(db),
    identities: new D1IdentityMappingRepository(db),
    memberships: new D1TenantMembershipRepository(db),
    permissions: new D1PermissionRepository(db),
    roles: new D1RoleRepository(db),
    roleAssignments: new D1RoleAssignmentRepository(db),
    idempotency: new D1IdempotencyRepository(db),
    audit: new D1AuditRepository(db),
  };
}
