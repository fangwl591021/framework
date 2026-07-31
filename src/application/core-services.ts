import type {
  IdentityMapping,
  PlatformUser,
  Role,
  RoleAssignment,
  Tenant,
  TenantMembership,
} from "../persistence/models";
import { AuthorizationApplication } from "./authorization-application";
import type { MutationContext } from "./core-application-base";

export type { MutationContext } from "./core-application-base";

export class PlatformCoreApplication extends AuthorizationApplication {}
export class CreatePlatformUserService {
  constructor(private readonly application: PlatformCoreApplication) {}
  execute(context: MutationContext): Promise<PlatformUser> {
    return this.application.createPlatformUser(context);
  }
}

export class CreateTenantService {
  constructor(private readonly application: PlatformCoreApplication) {}
  execute(name: string, context: MutationContext): Promise<Tenant> {
    return this.application.createTenant(name, context);
  }
}

export class LinkExternalIdentityService {
  constructor(private readonly application: PlatformCoreApplication) {}
  execute(
    userId: string,
    provider: string,
    issuerContext: string,
    subject: string,
    context: MutationContext,
  ): Promise<IdentityMapping> {
    return this.application.linkExternalIdentity(
      userId,
      provider,
      issuerContext,
      subject,
      context,
    );
  }
}

export class AddTenantMembershipService {
  constructor(private readonly application: PlatformCoreApplication) {}
  execute(
    tenantId: string,
    userId: string,
    joinSource: string,
    context: MutationContext,
  ): Promise<TenantMembership> {
    return this.application.addTenantMembership(
      tenantId,
      userId,
      joinSource,
      context,
    );
  }
}

export class CreateTenantRoleService {
  constructor(private readonly application: PlatformCoreApplication) {}
  execute(
    tenantId: string,
    roleKey: string,
    name: string,
    permissionKeys: readonly string[],
    context: MutationContext,
  ): Promise<Role> {
    return this.application.createTenantRole(
      tenantId,
      roleKey,
      name,
      permissionKeys,
      context,
    );
  }
}

export class AssignRoleService {
  constructor(private readonly application: PlatformCoreApplication) {}
  execute(
    tenantId: string,
    membershipId: string,
    roleKey: string,
    context: MutationContext,
  ): Promise<RoleAssignment> {
    return this.application.assignRole(
      tenantId,
      membershipId,
      roleKey,
      context,
    );
  }
}

export class CheckPermissionService {
  constructor(private readonly application: PlatformCoreApplication) {}
  execute(
    tenantId: string,
    membershipId: string,
    permissionKey: string,
  ): Promise<boolean> {
    return this.application.checkPermission(
      tenantId,
      membershipId,
      permissionKey,
    );
  }
}
