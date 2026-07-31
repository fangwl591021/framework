import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import type { MutationContext } from "../../src/application/core-services";
import type { Clock } from "../../src/core/clock";
import type { UuidV7 } from "../../src/core/uuidv7";
import {
  BusinessNetworkApplication, businessNetworkPermissions,
} from "../../src/modules/business-network";
import type { IdentityDigestKeyProvider } from "../../src/persistence/crypto";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
const encoder = new TextEncoder();

export class NetworkTestClock implements Clock {
  private value = Date.parse("2026-08-02T00:00:00.000Z");
  now(): Date {
    this.value += 1;
    return new Date(this.value);
  }
  current(): number {
    return this.value;
  }
}

class NetworkTestUuid implements UuidV7 {
  private value = 40_000;
  generate(): string {
    this.value += 1;
    return `019a0000-0000-7000-8000-${this.value.toString().padStart(12, "0")}`;
  }
}

class NetworkIdentityKeys implements IdentityDigestKeyProvider {
  current() {
    return {
      version: 1,
      secret: encoder.encode("network-identity-test-key-32-bytes-minimum"),
    };
  }
  previous() {
    return [];
  }
}

let sequence = 0;
export function networkContext(
  idempotencyKey?: string,
  actorReference = "local-network-test",
): MutationContext {
  sequence += 1;
  return {
    idempotencyKey: idempotencyKey ?? `network-idem-${sequence}`,
    actorType: "platform_user",
    actorReference,
    correlationId: `network-corr-${sequence}`,
  };
}

export function networkHarness(enabled = true) {
  const clock = new NetworkTestClock();
  const app = new BusinessNetworkApplication(
    env.DB, clock, new NetworkTestUuid(), new NetworkIdentityKeys(),
    {
      assertEnabled: async () => {
        if (!enabled) throw new Error("MODULE_NOT_ENTITLED");
      },
    },
  );
  return { app, clock };
}

const allPermissions = Object.values(businessNetworkPermissions);
const selfPermissions = [
  businessNetworkPermissions.networkRead,
  businessNetworkPermissions.referralRead,
  businessNetworkPermissions.salesRead,
  businessNetworkPermissions.commissionReadSelf,
  businessNetworkPermissions.teamRead,
];

export async function setupNetworkTenant(
  app: BusinessNetworkApplication,
  name: string,
) {
  const ownerUser = await app.createPlatformUser(networkContext());
  const tenant = await app.createTenant(name, networkContext());
  const ownerMembership = await app.addTenantMembership(
    tenant.id, ownerUser.id, "network-owner", networkContext(),
  );
  await app.assignRole(tenant.id, ownerMembership.id, "tenant_owner", networkContext());
  await app.createTenantRole(
    tenant.id, "network_manager", "Network Manager", allPermissions, networkContext(),
  );
  await app.assignRole(
    tenant.id, ownerMembership.id, "network_manager", networkContext(),
  );
  return { tenant, ownerUser, ownerMembership };
}

export async function createPartnerUser(
  app: BusinessNetworkApplication,
  tenantId: string,
  ownerMembershipId: string,
  label: string,
) {
  const user = await app.createPlatformUser(networkContext());
  const membership = await app.addTenantMembership(
    tenantId, user.id, "network-partner", networkContext(),
  );
  const roleKey = `network_self_${label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  await app.createTenantRole(
    tenantId, roleKey, `${label} Self Access`, selfPermissions, networkContext(),
  );
  await app.assignRole(tenantId, membership.id, roleKey, networkContext());
  const partner = await app.createNetworkPartner(
    tenantId, ownerMembershipId,
    { platformUserId: user.id, partnerType: "affiliate", displayName: label },
    networkContext(),
  );
  return { user, membership, partner };
}

export async function resetNetworkDatabase(): Promise<void> {
  sequence = 0;
  await reset();
  await applyD1Migrations(env.DB, [...migrations]);
}
