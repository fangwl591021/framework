import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];

describe("Migration 0009 safety", () => {
  it("rolls back permission registration and restores the immutable guard on forced failure", async () => {
    await reset();
    const prior = migrations.filter((migration) => !migration.name.includes("0009_ai_provider_enablement_readiness"));
    await applyD1Migrations(env.DB, [...prior]);
    const migration = migrations.find((item) => item.name.includes("0009_ai_provider_enablement_readiness"));
    if (!migration) throw new Error("0009 missing");
    const restore = migration.queries.findIndex((query) => query.includes("CREATE TRIGGER trg_permissions_immutable_insert"));
    const failing: D1Migration = { name: "0009_forced_failure.sql", queries: [...migration.queries.slice(0, restore), "INSERT INTO permissions(id,permission_key,description,status,created_at,updated_at) VALUES('019f0000-0000-7000-8000-999999999998','ai_provider_enablement:read','duplicate','active',1,1)"] };
    await expect(applyD1Migrations(env.DB, [failing])).rejects.toThrow();
    expect((await env.DB.prepare("SELECT count(*) count FROM permissions WHERE id LIKE '019f0000-0000-7000-8000-0000000009%'").first<{ count: number }>())?.count).toBe(0);
    expect((await env.DB.prepare("SELECT count(*) count FROM sqlite_master WHERE type='trigger' AND name='trg_permissions_immutable_insert'").first<{ count: number }>())?.count).toBe(1);
    await expect(env.DB.prepare("INSERT INTO permissions(id,permission_key,description,status,created_at,updated_at) VALUES('019f0000-0000-7000-8000-999999999997','ai:bad','bad','active',1,1)").run()).rejects.toThrow(/permission_vocabulary_immutable/);
  });

  it("reapplies safely only through the migration ledger", async () => {
    await reset(); await applyD1Migrations(env.DB, [...migrations]); await applyD1Migrations(env.DB, [...migrations]);
    expect((await env.DB.prepare("SELECT count(*) count FROM d1_migrations").first<{ count: number }>())?.count).toBe(9);
    expect((await env.DB.prepare("SELECT count(*) count FROM permissions WHERE id LIKE '019f0000-0000-7000-8000-0000000009%'").first<{ count: number }>())?.count).toBe(13);
  });
});
