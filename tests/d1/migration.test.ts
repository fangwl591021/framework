import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, [...migrations]);
});

describe("Phase 1 local D1 migration", () => {
  it("rebuilds exactly ten Phase 1 tables from a fresh local database", async () => {
    const result = await env.DB.prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations', '_cf_METADATA')
       ORDER BY name`,
    ).all<{ name: string }>();

    expect(result.results.map(({ name }) => name)).toEqual([
      "audit_records",
      "idempotency_records",
      "identity_mappings",
      "permissions",
      "platform_users",
      "role_assignments",
      "role_permissions",
      "roles",
      "tenant_memberships",
      "tenants",
    ]);
  });

  it("is repeat-safe through the D1 migration ledger", async () => {
    await applyD1Migrations(env.DB, [...migrations]);
    const counts = await Promise.all([
      env.DB.prepare("SELECT count(*) AS count FROM permissions").first<{ count: number }>(),
      env.DB.prepare("SELECT count(*) AS count FROM roles WHERE scope_type = 'core'").first<{ count: number }>(),
      env.DB.prepare("SELECT count(*) AS count FROM d1_migrations").first<{ count: number }>(),
    ]);

    expect(counts.map((row) => row?.count)).toEqual([8, 3, 1]);
  });

  it("keeps Core Roles and the Permission vocabulary immutable", async () => {
    await expect(
      env.DB.prepare(
        `UPDATE roles SET name = 'Changed' WHERE scope_type = 'core' AND role_key = 'tenant_owner'`,
      ).run(),
    ).rejects.toThrow(/core_role_immutable/);
    await expect(
      env.DB.prepare(
        `UPDATE permissions SET description = 'Changed' WHERE permission_key = 'tenant:read'`,
      ).run(),
    ).rejects.toThrow(/permission_vocabulary_immutable/);
  });
  it("enforces foreign keys, active uniqueness, and required indexes", async () => {
    const foreignKeys = await env.DB.prepare("PRAGMA foreign_keys").first<{ foreign_keys: number }>();
    expect(foreignKeys?.foreign_keys).toBe(1);

    const indexes = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name`,
    ).all<{ name: string }>();
    expect(indexes.results.map(({ name }) => name)).toEqual(expect.arrayContaining([
      "idx_audit_tenant_time",
      "idx_idempotency_tenant_expiry",
      "idx_role_assignments_member",
      "idx_tenant_memberships_tenant_status",
    ]));

    await expect(
      env.DB.prepare(
        `INSERT INTO tenant_memberships (
          id, tenant_id, platform_user_id, status, join_source, joined_at,
          suspended_at, closed_at, merged_into_membership_id, created_at, updated_at
        ) VALUES (
          '01980000-0000-7000-8000-000000009999',
          '01980000-0000-7000-8000-000000009998',
          '01980000-0000-7000-8000-000000009997',
          'active', 'test', 1, NULL, NULL, NULL, 1, 1
        )`,
      ).run(),
    ).rejects.toThrow();
  });
});