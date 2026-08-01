import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
const networkPermissionKeys = [
  "commission:manage",
  "commission:read_all",
  "commission:read_self",
  "network:manage",
  "network:read",
  "referral:manage",
  "referral:read",
  "sales:manage",
  "sales:read",
  "team:manage",
  "team:read",
] as const;

beforeEach(reset);

describe("Module Permission Registration Gate", () => {
  it("registers the exact reviewed vocabulary and restores every immutable guard", async () => {
    await applyD1Migrations(env.DB, [...migrations]);

    const permissions = await env.DB.prepare(
      `SELECT permission_key FROM permissions
       WHERE permission_key LIKE 'network:%'
          OR permission_key LIKE 'referral:%'
          OR permission_key LIKE 'sales:%'
          OR permission_key LIKE 'commission:%'
          OR permission_key LIKE 'team:%'
       ORDER BY permission_key`,
    ).all<{ permission_key: string }>();
    expect(permissions.results.map(({ permission_key }) => permission_key))
      .toEqual(networkPermissionKeys);

    const guards = await env.DB.prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'trigger' AND name IN (
         'trg_permissions_immutable_insert',
         'trg_permissions_immutable_update',
         'trg_permissions_immutable_delete'
       ) ORDER BY name`,
    ).all<{ name: string }>();
    expect(guards.results.map(({ name }) => name)).toEqual([
      "trg_permissions_immutable_delete",
      "trg_permissions_immutable_insert",
      "trg_permissions_immutable_update",
    ]);

    await expect(env.DB.prepare(
      `INSERT INTO permissions (
         id, permission_key, description, status, created_at, updated_at
       ) VALUES (
         '019a0000-0000-7000-8000-000000009901',
         'network:runtime_register', 'Forbidden', 'active', 1, 1
       )`,
    ).run()).rejects.toThrow(/permission_vocabulary_immutable/);
    await expect(env.DB.prepare(
      `UPDATE permissions SET description = 'Changed'
       WHERE permission_key = 'network:read'`,
    ).run()).rejects.toThrow(/permission_vocabulary_immutable/);
    await expect(env.DB.prepare(
      `DELETE FROM permissions WHERE permission_key = 'network:read'`,
    ).run()).rejects.toThrow(/permission_vocabulary_immutable/);
    await expect(env.DB.prepare(
      `INSERT INTO permissions (
         id, permission_key, description, status, created_at, updated_at
       ) VALUES (
         '019a0000-0000-7000-8000-000000009902',
         'network:read', 'Duplicate', 'active', 1, 1
       )`,
    ).run()).rejects.toThrow();

    await applyD1Migrations(env.DB, [...migrations]);
    const ledger = await env.DB.prepare(
      `SELECT count(*) AS count FROM d1_migrations`,
    ).first<{ count: number }>();
    expect(ledger?.count).toBe(9);
  });

  it("rolls back permission inserts and guard removal when registration fails", async () => {
    const coreMigrations = migrations.filter(
      ({ name }) => name.includes("0001_phase_1_core") || name.includes("0002_event_engine"),
    );
    await applyD1Migrations(env.DB, [...coreMigrations]);
    const networkMigration = migrations.find(
      ({ name }) => name.includes("0003_business_network_engine"),
    );
    if (!networkMigration) throw new Error("network migration not found");

    const restoreGuardIndex = networkMigration.queries.findIndex(
      (query) => query.includes("CREATE TRIGGER trg_permissions_immutable_insert"),
    );
    expect(restoreGuardIndex).toBeGreaterThan(0);
    const failingMigration: D1Migration = {
      name: "0003_permission_registration_forced_failure.sql",
      queries: [
        ...networkMigration.queries.slice(0, restoreGuardIndex),
        `INSERT INTO permissions (
           id, permission_key, description, status, created_at, updated_at
         ) VALUES (
           '019a0000-0000-7000-8000-000000009903',
           'network:read', 'Forced duplicate', 'active', 1, 1
         )`,
      ],
    };

    await expect(
      applyD1Migrations(env.DB, [failingMigration]),
    ).rejects.toThrow();

    const permissionCount = await env.DB.prepare(
      `SELECT count(*) AS count FROM permissions
       WHERE permission_key LIKE 'network:%'
          OR permission_key LIKE 'referral:%'
          OR permission_key LIKE 'sales:%'
          OR permission_key LIKE 'commission:%'
          OR permission_key LIKE 'team:%'`,
    ).first<{ count: number }>();
    expect(permissionCount?.count).toBe(0);

    const insertGuard = await env.DB.prepare(
      `SELECT count(*) AS count FROM sqlite_master
       WHERE type = 'trigger' AND name = 'trg_permissions_immutable_insert'`,
    ).first<{ count: number }>();
    expect(insertGuard?.count).toBe(1);

    const ledger = await env.DB.prepare(
      `SELECT name FROM d1_migrations ORDER BY id`,
    ).all<{ name: string }>();
    expect(ledger.results.map(({ name }) => name)).toEqual([
      "0001_phase_1_core.sql",
      "0002_event_engine.sql",
    ]);

    await expect(env.DB.prepare(
      `INSERT INTO permissions (
         id, permission_key, description, status, created_at, updated_at
       ) VALUES (
         '019a0000-0000-7000-8000-000000009904',
         'network:runtime_after_failure', 'Forbidden', 'active', 1, 1
       )`,
    ).run()).rejects.toThrow(/permission_vocabulary_immutable/);
  });
});
