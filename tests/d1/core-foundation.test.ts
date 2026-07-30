import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { PlatformCoreApplication, type MutationContext } from "../../src/application/core-services";
import type { Clock } from "../../src/core/clock";
import type { UuidV7 } from "../../src/core/uuidv7";
import { requestFingerprint, sha256Hex, type IdentityDigestKeyProvider } from "../../src/persistence/crypto";
import { DomainConflictError } from "../../src/persistence/models";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
const encoder = new TextEncoder();

class TestClock implements Clock {
  private value = Date.parse("2026-07-31T00:00:00.000Z");
  now(): Date {
    this.value += 1;
    return new Date(this.value);
  }
}

class TestUuidV7 implements UuidV7 {
  private value = 1000;
  generate(): string {
    this.value += 1;
    return `01980000-0000-7000-8000-${this.value.toString().padStart(12, "0")}`;
  }
}

class TestKeys implements IdentityDigestKeyProvider {
  constructor(
    private readonly activeVersion: number,
    private readonly priorVersions: readonly number[] = [],
  ) {}
  current() {
    return { version: this.activeVersion, secret: encoder.encode(`test-key-v${this.activeVersion}`) };
  }
  previous() {
    return this.priorVersions.map((version) => ({
      version,
      secret: encoder.encode(`test-key-v${version}`),
    }));
  }
}

let contextSequence = 0;
function context(key?: string): MutationContext {
  contextSequence += 1;
  return {
    idempotencyKey: key ?? `idem-${contextSequence}`,
    actorType: "service",
    actorReference: "local-integration-test",
    correlationId: `corr-${contextSequence}`,
  };
}

function application(keys: IdentityDigestKeyProvider = new TestKeys(1)) {
  return new PlatformCoreApplication(env.DB, new TestClock(), new TestUuidV7(), keys);
}

beforeEach(async () => {
  contextSequence = 0;
  await reset();
  await applyD1Migrations(env.DB, [...migrations]);
});

describe("Phase 1 core persistence and domain foundation", () => {
  it("runs User to Tenant to Membership to Role to Permission with tenant isolation", async () => {
    const app = application();
    const userContext = context("create-user-replay");
    const user = await app.createPlatformUser(userContext);
    const replayedUser = await app.createPlatformUser(userContext);
    expect(replayedUser).toEqual(user);

    const tenantA = await app.createTenant("Tenant A", context());
    const tenantB = await app.createTenant("Tenant B", context());
    const memberA = await app.addTenantMembership(tenantA.id, user.id, "bootstrap", context());
    const memberB = await app.addTenantMembership(tenantB.id, user.id, "bootstrap", context());
    await expect(
      app.addTenantMembership(tenantA.id, user.id, "duplicate", context()),
    ).rejects.toMatchObject({ code: "DUPLICATE_ACTIVE_RECORD" });
    const owner = await app.assignRole(tenantA.id, memberA.id, "tenant_owner", context());
    await app.assignRole(tenantB.id, memberB.id, "tenant_admin", context());
    const custom = await app.createTenantRole(
      tenantA.id,
      "auditor",
      "Tenant Auditor",
      ["tenant:read", "role:read"],
      context(),
    );
    await app.assignRole(tenantA.id, memberA.id, custom.roleKey, context());

    expect(owner.status).toBe("active");
    expect(await app.checkPermission(tenantA.id, memberA.id, "role:manage")).toBe(true);
    expect(await app.checkPermission(tenantB.id, memberB.id, "external_identity:read_self")).toBe(false);
    expect(await app.repositories.memberships.getById(tenantA.id, memberB.id)).toBeNull();
    await expect(
      app.changeMembershipStatus(tenantA.id, memberB.id, "suspended", context()),
    ).rejects.toMatchObject({ code: "TENANT_BOUNDARY_VIOLATION" });
    expect(await app.repositories.memberships.getById(tenantB.id, memberB.id)).toMatchObject({
      status: "active",
    });
    expect(await app.repositories.roles.getByIdForTenant(tenantB.id, custom.id)).toBeNull();
  });

  it("replays stored results, rejects fingerprint conflicts, and recovers stale processing", async () => {
    const app = application();
    const shared = context("tenant-key");
    const first = await app.createTenant("Replay Tenant", shared);
    expect(await app.createTenant("Replay Tenant", shared)).toEqual(first);
    await expect(app.createTenant("Different Tenant", shared)).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });

    const staleKey = "stale-key";
    const keyHash = await sha256Hex(staleKey);
    const fingerprint = await requestFingerprint({ name: "Recovered Tenant" });
    await env.DB.prepare(
      `INSERT INTO idempotency_records (
        id, scope_type, tenant_id, operation, idempotency_key_hash,
        request_fingerprint, status, stored_result_json, result_code,
        processing_owner, generation, lease_expires_at, started_at,
        completed_at, expires_at, created_at, updated_at
      ) VALUES (
        '01980000-0000-7000-8000-000000008001', 'platform', NULL,
        'tenant.create', ?1, ?2, 'processing', NULL, NULL, 'stale-owner',
        1, 1, 1, NULL, 9999999999999, 1, 1
      )`,
    ).bind(keyHash, fingerprint).run();

    const recovered = await app.createTenant("Recovered Tenant", context(staleKey));
    expect(recovered.name).toBe("Recovered Tenant");
    const record = await app.repositories.idempotency.findPlatform("tenant.create", keyHash);
    expect(record).toMatchObject({ status: "completed", generation: 2 });
  });

  it("stores versioned identity HMAC only and resolves across key rotation", async () => {
    const rawSubject = "provider-raw-subject-must-never-persist";
    const appV1 = application(new TestKeys(1));
    const user = await appV1.createPlatformUser(context());
    const linked = await appV1.linkExternalIdentity(
      user.id,
      "line",
      "channel:123",
      rawSubject,
      context(),
    );
    expect(linked.subjectDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(linked.subjectDigest).not.toContain(rawSubject);

    const appV2 = application(new TestKeys(2, [1]));
    expect(await appV2.resolveExternalIdentity("line", "channel:123", rawSubject)).toMatchObject({
      id: user.id,
    });
    expect(
      await appV2.linkExternalIdentity(user.id, "line", "channel:123", rawSubject, context()),
    ).toEqual(linked);

    const rows = await env.DB.prepare(
      `SELECT provider, issuer_context, subject_digest, digest_key_version
       FROM identity_mappings`,
    ).all<Record<string, unknown>>();
    const schema = await env.DB.prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'identity_mappings'`,
    ).first<{ sql: string }>();
    expect(JSON.stringify(rows.results)).not.toContain(rawSubject);
    expect(schema?.sql.toLowerCase()).not.toMatch(/raw_subject|provider_subject(?!_digest)/);
    expect(rows.results).toHaveLength(1);
  });

  it("protects the final active tenant owner at the database boundary", async () => {
    const app = application();
    const firstUser = await app.createPlatformUser(context());
    const tenant = await app.createTenant("Owner Guard", context());
    const firstMember = await app.addTenantMembership(tenant.id, firstUser.id, "bootstrap", context());
    const firstOwner = await app.assignRole(tenant.id, firstMember.id, "tenant_owner", context());

    const deniedContext = context("last-owner-denial");
    await expect(app.revokeRole(tenant.id, firstOwner.id, deniedContext)).rejects.toEqual(
      expect.objectContaining({ code: "LAST_TENANT_OWNER" }),
    );
    await expect(app.revokeRole(tenant.id, firstOwner.id, deniedContext)).rejects.toEqual(
      expect.objectContaining({ code: "LAST_TENANT_OWNER" }),
    );
    const deniedAudit = await app.repositories.audit.listForTenant(tenant.id);
    expect(deniedAudit.filter(({ reasonCode }) => reasonCode === "LAST_TENANT_OWNER")).toHaveLength(1);

    const secondUser = await app.createPlatformUser(context());
    const secondMember = await app.addTenantMembership(tenant.id, secondUser.id, "bootstrap", context());
    await app.assignRole(tenant.id, secondMember.id, "tenant_owner", context());
    expect(await app.revokeRole(tenant.id, firstOwner.id, context())).toMatchObject({ status: "revoked" });
  });

  it("enforces merged and anonymized terminal lifecycle rules", async () => {
    const app = application();
    const source = await app.createPlatformUser(context());
    const target = await app.createPlatformUser(context());
    const tenant = await app.createTenant("Lifecycle", context());
    await app.changePlatformUserStatus(source.id, "merged", context(), target.id);
    await expect(
      app.addTenantMembership(tenant.id, source.id, "invalid", context()),
    ).rejects.toBeInstanceOf(DomainConflictError);

    const anonymized = await app.createPlatformUser(context());
    await app.changePlatformUserStatus(anonymized.id, "anonymized", context());
    await expect(
      env.DB.prepare(
        `UPDATE platform_users SET status = 'active', anonymized_at = NULL, updated_at = updated_at + 1
         WHERE id = ?1`,
      ).bind(anonymized.id).run(),
    ).rejects.toThrow(/platform_user_terminal_state/);
  });

  it("writes bounded minimal audit records without identity subjects or payload copies", async () => {
    const app = application();
    const user = await app.createPlatformUser(context());
    const tenant = await app.createTenant("Audit Tenant", context());
    await app.addTenantMembership(tenant.id, user.id, "audit-test", context());

    const tenantAudit = await app.repositories.audit.listForTenant(tenant.id);
    const platformAudit = await app.repositories.audit.listPlatform();
    expect(tenantAudit.map(({ action }) => action)).toContain("membership.add");
    expect(platformAudit.map(({ action }) => action)).toEqual(
      expect.arrayContaining(["platform_user.create", "tenant.create"]),
    );

    const auditSchema = await env.DB.prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'audit_records'`,
    ).first<{ sql: string }>();
    expect(auditSchema?.sql.toLowerCase()).not.toMatch(/payload|before_summary|after_summary|subject_digest/);
  });

  it("uses bounded indexed queries for permission, audit, and idempotency paths", async () => {
    const plans = await Promise.all([
      env.DB.prepare(
        `EXPLAIN QUERY PLAN
         SELECT assignment.id
         FROM role_assignments AS assignment
         JOIN role_permissions AS mapping
           ON mapping.tenant_scope_key = assignment.role_scope_key
          AND mapping.role_id = assignment.role_id
         JOIN permissions AS permission ON permission.id = mapping.permission_id
         WHERE assignment.tenant_id = ?1 AND assignment.tenant_membership_id = ?2
           AND assignment.status = 'active' AND permission.permission_key = ?3
         LIMIT 1`,
      ).bind("tenant", "member", "tenant:read").all<{ detail: string }>(),
      env.DB.prepare(
        `EXPLAIN QUERY PLAN SELECT id FROM audit_records
         WHERE tenant_id = ?1 ORDER BY occurred_at DESC, id DESC LIMIT 100`,
      ).bind("tenant").all<{ detail: string }>(),
      env.DB.prepare(
        `EXPLAIN QUERY PLAN SELECT id FROM idempotency_records
         WHERE tenant_id = ?1 AND status = ?2 AND expires_at <= ?3 LIMIT 100`,
      ).bind("tenant", "processing", 1).all<{ detail: string }>(),
    ]);
    const details = plans.flatMap((plan) => plan.results.map(({ detail }) => detail)).join("\n");
    expect(details).toMatch(/idx_role_assignments_member|uq_role_assignments_active/);
    expect(details).toContain("idx_audit_tenant_time");
    expect(details).toContain("idx_idempotency_tenant_expiry");
  });
});