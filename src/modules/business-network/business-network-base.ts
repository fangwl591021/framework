import type { MutationContext } from "../../application/core-application-base";
import { assertSafeText } from "../../application/core-application-base";
import { PlatformCoreApplication } from "../../application/core-services";
import type { Clock } from "../../core/clock";
import type { UuidV7 } from "../../core/uuidv7";
import type { IdentityDigestKeyProvider } from "../../persistence/crypto";
import { businessNetworkPermissions } from "./contract";
import { BusinessNetworkError, type NetworkPartner } from "./models";
import type { BusinessNetworkModuleAccessPort } from "./ports";
import { BusinessNetworkRepository } from "./repository";

export type NetworkPermission = keyof typeof businessNetworkPermissions;
export type NetworkMutationContext = MutationContext;

export class BusinessNetworkBase extends PlatformCoreApplication {
  readonly networkRepository: BusinessNetworkRepository;

  constructor(
    db: D1Database,
    clock: Clock,
    uuidv7: UuidV7,
    identityKeys: IdentityDigestKeyProvider,
    private readonly moduleAccess: BusinessNetworkModuleAccessPort,
  ) {
    super(db, clock, uuidv7, identityKeys);
    this.networkRepository = new BusinessNetworkRepository(db);
  }

  protected timestamp(): number {
    return this.clock.now().getTime();
  }

  protected text(name: string, value: string, max: number): void {
    assertSafeText(name, value, max);
  }

  protected async requireNetworkPermission(
    tenantId: string,
    membershipId: string,
    permission: NetworkPermission,
  ): Promise<void> {
    await this.moduleAccess.assertEnabled(tenantId, membershipId);
    const tenant = await this.repositories.tenants.getById(tenantId);
    if (!tenant || tenant.status !== "active") {
      throw new BusinessNetworkError("NETWORK_TENANT_BOUNDARY");
    }
    if (!await this.checkPermission(
      tenantId, membershipId, businessNetworkPermissions[permission],
    )) {
      throw new BusinessNetworkError("NETWORK_PERMISSION_DENIED");
    }
  }

  protected async requirePartner(
    tenantId: string,
    partnerId: string,
    active = false,
  ): Promise<NetworkPartner> {
    const partner = await this.networkRepository.getPartner(tenantId, partnerId);
    if (!partner) throw new BusinessNetworkError("NETWORK_NOT_FOUND");
    if (active && partner.status !== "active") {
      throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    }
    return partner;
  }
}
