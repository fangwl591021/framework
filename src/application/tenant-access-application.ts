import {
  DomainConflictError,
  DomainNotFoundError,
  TenantBoundaryError,
  type Tenant,
  type TenantMembership,
} from "../persistence/models";
import {
  assertSafeText,
  translateConstraint,
  type MutationContext,
} from "./core-application-base";
import { IdentityCoreApplication } from "./identity-core-application";

export class TenantAccessApplication extends IdentityCoreApplication {  async createTenant(
    name: string,
    context: MutationContext,
  ): Promise<Tenant> {
    assertSafeText("tenant name", name, 120);
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "platform", tenantId: null },
      "tenant.create",
      { name },
      context,
      (timestamp) => ({
        result: {
          id,
          name,
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
        } satisfies Tenant,
        statements: [
          this.db
            .prepare(
              `INSERT INTO tenants (id, name, status, created_at, updated_at)
               VALUES (?1, ?2, 'active', ?3, ?3)`,
            )
            .bind(id, name, timestamp),
        ],
        audit: {
          action: "tenant.create",
          resourceType: "tenant",
          resourceReference: id,
          reasonCode: "CREATED",
        },
      }),
    );
  }

  async updateTenant(
    tenantId: string,
    change: { readonly name?: string; readonly status?: "active" | "suspended" },
    context: MutationContext,
  ): Promise<Tenant> {
    const current = await this.repositories.tenants.getById(tenantId);
    if (!current) throw new DomainNotFoundError("tenant");
    const name = change.name ?? current.name;
    const status = change.status ?? current.status;
    assertSafeText("tenant name", name, 120);
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "tenant.update",
      { tenantId, name, status },
      context,
      (timestamp) => ({
        result: { ...current, name, status, updatedAt: timestamp },
        statements: [
          this.db
            .prepare(
              `UPDATE tenants SET name = ?1, status = ?2, updated_at = ?3
               WHERE id = ?4`,
            )
            .bind(name, status, timestamp, tenantId),
        ],
        audit: {
          action: "tenant.update",
          resourceType: "tenant",
          resourceReference: tenantId,
          reasonCode: "UPDATED",
        },
      }),
    );
  }

  async addTenantMembership(
    tenantId: string,
    platformUserId: string,
    joinSource: string,
    context: MutationContext,
  ): Promise<TenantMembership> {
    assertSafeText("joinSource", joinSource, 64);
    const tenant = await this.repositories.tenants.getById(tenantId);
    if (!tenant) throw new DomainNotFoundError("tenant");
    if (tenant.status !== "active") {
      throw new DomainConflictError("LIFECYCLE_CONFLICT");
    }
    const user = await this.repositories.platformUsers.getById(platformUserId);
    if (!user) throw new DomainNotFoundError("platform_user");
    if (user.status !== "active") {
      throw new DomainConflictError("LIFECYCLE_CONFLICT");
    }
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "membership.add",
      { tenantId, platformUserId, joinSource },
      context,
      (timestamp) => ({
        result: {
          id,
          tenantId,
          platformUserId,
          status: "active",
          joinSource,
        } satisfies TenantMembership,
        statements: [
          this.db
            .prepare(
              `INSERT INTO tenant_memberships (
                id, tenant_id, platform_user_id, status, join_source, joined_at,
                suspended_at, closed_at, merged_into_membership_id, created_at, updated_at
              ) VALUES (?1, ?2, ?3, 'active', ?4, ?5, NULL, NULL, NULL, ?5, ?5)`,
            )
            .bind(id, tenantId, platformUserId, joinSource, timestamp),
        ],
        audit: {
          action: "membership.add",
          resourceType: "tenant_membership",
          resourceReference: id,
          reasonCode: "ADDED",
        },
      }),
    );
  }

  async changeMembershipStatus(
    tenantId: string,
    membershipId: string,
    status: "suspended" | "closed" | "merged",
    context: MutationContext,
    mergedIntoMembershipId?: string,
  ): Promise<TenantMembership> {
    const current = await this.repositories.memberships.getById(
      tenantId,
      membershipId,
    );
    if (!current) throw new TenantBoundaryError();
    if (current.status === "closed" || current.status === "merged") {
      throw new DomainConflictError("LIFECYCLE_CONFLICT");
    }
    if (status === "merged") {
      if (!mergedIntoMembershipId || mergedIntoMembershipId === membershipId) {
        throw new DomainConflictError("LIFECYCLE_CONFLICT");
      }
      const target = await this.repositories.memberships.getById(
        tenantId,
        mergedIntoMembershipId,
      );
      if (!target || target.status !== "active") {
        throw new DomainConflictError("LIFECYCLE_CONFLICT");
      }
    }
    try {
      return await this.executeIdempotent(
        { scopeType: "tenant", tenantId },
        `membership.${status}`,
        { tenantId, membershipId, status, mergedIntoMembershipId: mergedIntoMembershipId ?? null },
        context,
        (timestamp) => ({
          result: { ...current, status },
          statements: [
            this.db
              .prepare(
                `UPDATE tenant_memberships
                 SET status = ?1,
                     suspended_at = CASE WHEN ?1 = 'suspended' THEN ?2 ELSE NULL END,
                     closed_at = CASE WHEN ?1 = 'closed' THEN ?2 ELSE NULL END,
                     merged_into_membership_id = CASE WHEN ?1 = 'merged' THEN ?3 ELSE NULL END,
                     updated_at = ?2
                 WHERE tenant_id = ?4 AND id = ?5`,
              )
              .bind(
                status,
                timestamp,
                mergedIntoMembershipId ?? null,
                tenantId,
                membershipId,
              ),
          ],
          audit: {
            action: `membership.${status}`,
            resourceType: "tenant_membership",
            resourceReference: membershipId,
            reasonCode: status.toUpperCase(),
          },
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("last_tenant_owner") || message.includes("LAST_TENANT_OWNER")) {
        await this.recordDenied(
          { scopeType: "tenant", tenantId },
          `membership.${status}`,
          { tenantId, membershipId, status, mergedIntoMembershipId: mergedIntoMembershipId ?? null },
          context,
          {
            action: `membership.${status}`,
            resourceType: "tenant_membership",
            resourceReference: membershipId,
            reasonCode: "LAST_TENANT_OWNER",
          },
          "LAST_TENANT_OWNER",
        );
      }
      translateConstraint(error);
    }
  }

}
