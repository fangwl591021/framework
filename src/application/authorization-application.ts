import {
  DomainConflictError,
  DomainNotFoundError,
  TenantBoundaryError,
  type Role,
  type RoleAssignment,
} from "../persistence/models";
import {
  assertSafeText,
  translateConstraint,
  type MutationContext,
} from "./core-application-base";
import { TenantAccessApplication } from "./tenant-access-application";

export class AuthorizationApplication extends TenantAccessApplication {  async createTenantRole(
    tenantId: string,
    roleKey: string,
    name: string,
    permissionKeys: readonly string[],
    context: MutationContext,
  ): Promise<Role> {
    assertSafeText("roleKey", roleKey, 80);
    assertSafeText("role name", name, 120);
    if (roleKey.startsWith("tenant_") || permissionKeys.length === 0) {
      throw new TypeError("Tenant role key or permission set is invalid");
    }
    const uniqueKeys = [...new Set(permissionKeys)];
    const permissions = await Promise.all(
      uniqueKeys.map((key) => this.repositories.permissions.getByKey(key)),
    );
    if (permissions.some((item) => !item || item.status !== "active")) {
      throw new DomainNotFoundError("permission");
    }
    const id = this.uuidv7.generate();
    const scopeKey = `tenant:${tenantId}`;
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "role.create",
      { tenantId, roleKey, name, permissionKeys: uniqueKeys.sort() },
      context,
      (timestamp) => ({
        result: {
          id,
          scopeType: "tenant",
          tenantId,
          tenantScopeKey: scopeKey,
          roleKey,
          name,
          systemManaged: false,
          status: "active",
        } satisfies Role,
        statements: [
          this.db
            .prepare(
              `INSERT INTO roles (
                id, scope_type, tenant_id, tenant_scope_key, role_key, name,
                system_managed, status, created_at, updated_at
              ) VALUES (?1, 'tenant', ?2, ?3, ?4, ?5, 0, 'active', ?6, ?6)`,
            )
            .bind(id, tenantId, scopeKey, roleKey, name, timestamp),
          ...permissions.map((item) =>
            this.db
              .prepare(
                `INSERT INTO role_permissions (
                  tenant_scope_key, role_id, permission_id, created_at
                ) VALUES (?1, ?2, ?3, ?4)`,
              )
              .bind(scopeKey, id, (item as NonNullable<typeof item>).id, timestamp),
          ),
        ],
        audit: {
          action: "role.create",
          resourceType: "role",
          resourceReference: id,
          reasonCode: "CREATED",
        },
      }),
    );
  }

  async assignRole(
    tenantId: string,
    membershipId: string,
    roleKey: string,
    context: MutationContext,
  ): Promise<RoleAssignment> {
    const member = await this.repositories.memberships.getById(
      tenantId,
      membershipId,
    );
    if (!member) throw new TenantBoundaryError();
    if (member.status !== "active") {
      throw new DomainConflictError("LIFECYCLE_CONFLICT");
    }
    const role =
      (await this.repositories.roles.getCoreByKey(roleKey)) ??
      (await this.repositories.roles.getTenantByKey(tenantId, roleKey));
    if (!role || role.status !== "active") throw new DomainNotFoundError("role");
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "role.assign",
      { tenantId, membershipId, roleId: role.id },
      context,
      (timestamp) => ({
        result: {
          id,
          tenantId,
          tenantMembershipId: membershipId,
          roleId: role.id,
          roleScopeKey: role.tenantScopeKey,
          status: "active",
        } satisfies RoleAssignment,
        statements: [
          this.db
            .prepare(
              `INSERT INTO role_assignments (
                id, tenant_id, tenant_membership_id, role_id, role_scope_key,
                assignment_scope_key, status, assigned_at, revoked_at,
                created_at, updated_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, 'tenant:' || ?2, 'active', ?6, NULL, ?6, ?6
              )`,
            )
            .bind(
              id,
              tenantId,
              membershipId,
              role.id,
              role.tenantScopeKey,
              timestamp,
            ),
        ],
        audit: {
          action: "role.assign",
          resourceType: "role_assignment",
          resourceReference: id,
          reasonCode: "ASSIGNED",
        },
      }),
    );
  }

  async revokeRole(
    tenantId: string,
    assignmentId: string,
    context: MutationContext,
  ): Promise<RoleAssignment> {
    const current = await this.repositories.roleAssignments.getById(
      tenantId,
      assignmentId,
    );
    if (!current) throw new TenantBoundaryError();
    try {
      return await this.executeIdempotent(
        { scopeType: "tenant", tenantId },
        "role.revoke",
        { tenantId, assignmentId },
        context,
        (timestamp) => ({
          result: { ...current, status: "revoked" },
          statements: [
            this.db
              .prepare(
                `UPDATE role_assignments
                 SET status = 'revoked', revoked_at = ?1, updated_at = ?1
                 WHERE tenant_id = ?2 AND id = ?3 AND status = 'active'`,
              )
              .bind(timestamp, tenantId, assignmentId),
          ],
          audit: {
            action: "role.revoke",
            resourceType: "role_assignment",
            resourceReference: assignmentId,
            reasonCode: "REVOKED",
          },
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("last_tenant_owner") || message.includes("LAST_TENANT_OWNER")) {
        await this.recordDenied(
          { scopeType: "tenant", tenantId },
          "role.revoke",
          { tenantId, assignmentId },
          context,
          {
            action: "role.revoke",
            resourceType: "role_assignment",
            resourceReference: assignmentId,
            reasonCode: "LAST_TENANT_OWNER",
          },
          "LAST_TENANT_OWNER",
        );
      }
      translateConstraint(error);
    }
  }

  async checkPermission(
    tenantId: string,
    membershipId: string,
    permissionKey: string,
  ): Promise<boolean> {
    return this.repositories.roleAssignments.hasPermission(
      tenantId,
      membershipId,
      permissionKey,
    );
  }
}
