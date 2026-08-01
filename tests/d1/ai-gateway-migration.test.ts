import { env } from "cloudflare:workers";
import { applyD1Migrations,reset,type D1Migration } from "cloudflare:test";
import { describe,expect,it } from "vitest";
const migrations=env.TEST_MIGRATIONS as readonly D1Migration[];

describe("Migration 0008 safety",()=>{
  it("rolls back permission registration and restores protection on forced failure",async()=>{
    await reset();const prior=migrations.filter((migration)=>!migration.name.includes("0008_ai_gateway")&&!migration.name.includes("0009_ai_provider_enablement_readiness"));await applyD1Migrations(env.DB,[...prior]);
    const migration=migrations.find((value)=>value.name.includes("0008_ai_gateway"));if(!migration)throw new Error("0008 missing");
    const restore=migration.queries.findIndex((query)=>query.includes("CREATE TRIGGER trg_permissions_immutable_insert"));
    const failing:D1Migration={name:"0008_forced_failure.sql",queries:[...migration.queries.slice(0,restore),"INSERT INTO permissions(id,permission_key,description,status,created_at,updated_at) VALUES('019f0000-0000-7000-8000-999999999998','ai_task:read','duplicate','active',1,1)"]};
    await expect(applyD1Migrations(env.DB,[failing])).rejects.toThrow();
    expect((await env.DB.prepare("SELECT count(*) count FROM permissions WHERE permission_key LIKE 'ai_%'").first<{count:number}>())?.count).toBe(0);
    expect((await env.DB.prepare("SELECT count(*) count FROM sqlite_master WHERE type='trigger' AND name='trg_permissions_immutable_insert'").first<{count:number}>())?.count).toBe(1);
    await expect(env.DB.prepare("INSERT INTO permissions(id,permission_key,description,status,created_at,updated_at) VALUES('019f0000-0000-7000-8000-999999999997','ai:bad','bad','active',1,1)").run()).rejects.toThrow(/permission_vocabulary_immutable/);
  });
  it("reapplies only through the migration ledger",async()=>{await reset();await applyD1Migrations(env.DB,[...migrations]);await applyD1Migrations(env.DB,[...migrations]);expect((await env.DB.prepare("SELECT count(*) count FROM d1_migrations").first<{count:number}>())?.count).toBe(10);expect((await env.DB.prepare("SELECT count(*) count FROM permissions WHERE permission_key LIKE 'ai_%'").first<{count:number}>())?.count).toBe(25);});
});
