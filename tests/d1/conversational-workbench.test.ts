import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApplicationAssemblyApplication,
  applicationAssemblyPermissions,
} from "../../src/application-assembly";
import type { MutationContext } from "../../src/application/core-application-base";
import type { Clock } from "../../src/core/clock";
import type { UuidV7 } from "../../src/core/uuidv7";
import type { IdentityDigestKeyProvider } from "../../src/persistence/crypto";
import {
  AllowlistedOperationRouter,
  ConversationalWorkbenchApplication,
  D1WorkbenchRepository,
  DeterministicIntentResolver,
  WorkbenchError,
  type OperationResult,
  type TrustedConversationContext,
  type WorkbenchObservationPort,
  type WorkbenchOperationAdapter,
} from "../../src/conversational-workbench";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
class ClockStub implements Clock {
  value = Date.parse("2027-03-01T00:00:00Z");
  now() {
    return new Date(this.value);
  }
  advance(ms: number) {
    this.value += ms;
  }
}
class UuidStub implements UuidV7 {
  n = 700000;
  generate() {
    this.n += 1;
    return `019e0000-0000-7000-8000-${String(this.n).padStart(12, "0")}`;
  }
}
class Keys implements IdentityDigestKeyProvider {
  current() {
    return {
      version: 1,
      secret: new TextEncoder().encode("workbench-local-identity-key-32bytes"),
    };
  }
  previous() {
    return [];
  }
}
let sequence = 0;
const mutation = (): MutationContext => ({
  idempotencyKey: `wb-seed-${++sequence}`,
  actorType: "service",
  actorReference: `digest:${"b".repeat(64)}`,
  correlationId: `wb-seed-corr-${sequence}`,
});

type Harness = Awaited<ReturnType<typeof seed>>;
async function seed(
  observation?: WorkbenchObservationPort,
  failure?: "traffic" | "degraded",
) {
  sequence = 0;
  await reset();
  await applyD1Migrations(env.DB, [...migrations]);
  const clock = new ClockStub(),
    uuid = new UuidStub(),
    core = new ApplicationAssemblyApplication(env.DB, clock, uuid, new Keys());
  const user = await core.createPlatformUser(mutation()),
    tenant = await core.createTenant("Workbench Tenant", mutation()),
    membership = await core.addTenantMembership(
      tenant.id,
      user.id,
      "workbench",
      mutation(),
    );
  await core.assignRole(tenant.id, membership.id, "tenant_owner", mutation());
  await core.createTenantRole(
    tenant.id,
    "workbench_user",
    "Workbench User",
    ["conversation:use", ...Object.values(applicationAssemblyPermissions)],
    mutation(),
  );
  await core.assignRole(tenant.id, membership.id, "workbench_user", mutation());
  const application = await core.createApplication(
    tenant.id,
    { membershipId: membership.id },
    { applicationKey: "workbench", name: "Workbench", defaultLocale: "zh-TW" },
    mutation(),
  );
  const calls: string[] = [];
  const adapter = (
    moduleKey: string,
    operations: readonly string[],
  ): WorkbenchOperationAdapter => ({
    moduleKey,
    operations,
    invoke: async (value) => {
      calls.push(value.plan.operationKey);
      if (failure)
        throw new WorkbenchError(
          failure === "traffic" ? "TRAFFIC_REJECTED" : "SERVICE_DEGRADED",
        );
      const result: OperationResult = {
        message: `完成 ${value.plan.operationKey}`,
        receipt: `receipt:${value.plan.id}`,
        summary: { operation: value.plan.operationKey },
      };
      return result;
    },
  });
  const router = new AllowlistedOperationRouter([
    adapter("event_engine", [
      "event.create",
      "event.registration_summary",
      "event.list",
      "event.cancel",
    ]),
    adapter("business_network_engine", [
      "network.my_commission",
      "network.my_performance",
      "network.my_referrals",
    ]),
    adapter("application_assembly", [
      "module.list_available",
      "module.enable",
      "module.disable",
    ]),
    adapter("platform_observability", [
      "diagnostics.today_summary",
      "diagnostics.lookup_support_code",
    ]),
  ]);
  const observations: string[] = [];
  const observer = observation ?? {
    record: async (event: { eventType: string }) => {
      observations.push(event.eventType);
    },
  };
  const workbench = new ConversationalWorkbenchApplication(
    new D1WorkbenchRepository(env.DB),
    new DeterministicIntentResolver(),
    router,
    { hasPermission: (t, m, p) => core.checkPermission(t, m, p) },
    observer,
    clock,
    uuid,
  );
  const context: TrustedConversationContext = {
    source: "trusted_runtime_context",
    tenantId: tenant.id,
    applicationId: application.id,
    actorMembershipId: membership.id,
    channelKey: "web",
    correlationId: "workbench-correlation",
  };
  return {
    clock,
    uuid,
    core,
    user,
    tenant,
    membership,
    application,
    workbench,
    context,
    calls,
    observations,
  };
}
beforeEach(async () => {
  await seed();
});

async function prepareEvent(h: Harness, key = "start") {
  return h.workbench.handle(h.context, {
    messageKey: key,
    text: "我要建立活動",
    slots: {
      activity_name: "Launch",
      start_time: h.clock.value + 1000,
      end_time: h.clock.value + 2000,
      capacity: 20,
    },
  });
}

describe("Migration 0007", () => {
  it("creates seven normalized tables, indexes, triggers, permissions and intents", async () => {
    const tables = (
      await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('conversation_sessions','conversation_messages','intent_registry','conversation_slot_values','operation_plans','operation_confirmations','operation_execution_records') ORDER BY name",
      ).all<{ name: string }>()
    ).results;
    expect(tables).toHaveLength(7);
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM permissions WHERE permission_key LIKE 'conversation:%' OR permission_key LIKE 'workbench_intent:%' OR permission_key LIKE 'operation_plan:%'",
        ).first<{ count: number }>()
      )?.count,
    ).toBe(8);
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM intent_registry WHERE status='active'",
        ).first<{ count: number }>()
      )?.count,
    ).toBe(12);
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM sqlite_master WHERE type='index' AND name LIKE 'idx_operation_%'",
        ).first<{ count: number }>()
      )?.count,
    ).toBeGreaterThanOrEqual(5);
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM sqlite_master WHERE type='trigger' AND name LIKE 'trg_operation_%'",
        ).first<{ count: number }>()
      )?.count,
    ).toBeGreaterThanOrEqual(6);
  });
  it("keeps permission insertion closed after migration", async () => {
    await expect(
      env.DB.prepare(
        "INSERT INTO permissions(id,permission_key,description,status,created_at,updated_at) VALUES('019e0000-0000-7000-8000-000000999999','bad:permission','bad','active',1,1)",
      ).run(),
    ).rejects.toThrow(/permission_vocabulary_immutable/);
  });
  it("uses bounded tenant-scoped indexes for active session and plan lookup", async () => {
    const sessionPlan = (
      await env.DB.prepare(
        "EXPLAIN QUERY PLAN SELECT id FROM conversation_sessions WHERE tenant_id=?1 AND application_id=?2 AND actor_membership_id=?3 AND channel_key=?4 AND status IN ('active','waiting_for_input','waiting_for_confirmation','processing') AND expires_at>?5 ORDER BY updated_at DESC,id DESC LIMIT 1",
      )
        .bind("tenant", "application", "membership", "test", 0)
        .all<{ detail: string }>()
    ).results
      .map((row) => row.detail)
      .join(" ");
    const operationPlan = (
      await env.DB.prepare(
        "EXPLAIN QUERY PLAN SELECT id FROM operation_plans WHERE tenant_id=?1 AND conversation_id=?2 AND status IN ('prepared','awaiting_confirmation','approved','executing') ORDER BY plan_version DESC LIMIT 1",
      )
        .bind("tenant", "conversation")
        .all<{ detail: string }>()
    ).results
      .map((row) => row.detail)
      .join(" ");
    expect(sessionPlan).toContain("idx_conversation_actor_active");
    expect(operationPlan).toContain("idx_operation_plan_conversation");
  });
  it("rolls back a forced mid-migration failure and restores permission protection", async () => {
    await reset();
    const prior = migrations.filter(
      (m) => !m.name.includes("0007_conversational_workbench"),
    );
    await applyD1Migrations(env.DB, [...prior]);
    const migration = migrations.find((m) =>
      m.name.includes("0007_conversational_workbench"),
    );
    if (!migration) throw new Error("0007 missing");
    const restore = migration.queries.findIndex((q) =>
      q.includes("CREATE TRIGGER trg_permissions_immutable_insert"),
    );
    expect(restore).toBeGreaterThan(0);
    const failing: D1Migration = {
      name: "0007_forced_failure.sql",
      queries: [
        ...migration.queries.slice(0, restore),
        "INSERT INTO permissions(id,permission_key,description,status,created_at,updated_at) VALUES('019e0000-0000-7000-8000-000000000401','conversation:use','duplicate','active',1,1)",
      ],
    };
    await expect(applyD1Migrations(env.DB, [failing])).rejects.toThrow();
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM permissions WHERE permission_key='conversation:use'",
        ).first<{ count: number }>()
      )?.count,
    ).toBe(0);
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM sqlite_master WHERE type='trigger' AND name='trg_permissions_immutable_insert'",
        ).first<{ count: number }>()
      )?.count,
    ).toBe(1);
  });
});

describe("Conversation, slots and confirmation", () => {
  it("returns action_required for missing slots", async () => {
    const h = await seed();
    const r = await h.workbench.handle(h.context, {
      messageKey: "m1",
      text: "我要建立活動",
    });
    expect(r.status).toBe("action_required");
    expect(r.message).toContain("活動名稱");
  });
  it("does not re-ask validated slots", async () => {
    const h = await seed();
    await h.workbench.handle(h.context, {
      messageKey: "m1",
      text: "我要建立活動",
      slots: { activity_name: "Launch" },
    });
    const r = await h.workbench.handle(h.context, {
      messageKey: "m2",
      text: "補充資料",
      slots: {
        start_time: h.clock.value + 1,
        end_time: h.clock.value + 2,
        capacity: 2,
      },
    });
    expect(r.status).toBe("confirmation_required");
    expect(JSON.stringify(r.summary)).toContain("Launch");
  });
  it("preserves safe slot revision evidence", async () => {
    const h = await seed();
    await h.workbench.handle(h.context, {
      messageKey: "m1",
      text: "我要建立活動",
      slots: { activity_name: "Old" },
    });
    await h.workbench.handle(h.context, {
      messageKey: "m2",
      text: "補充資料",
      slots: { activity_name: "New" },
    });
    const rows = (
      await env.DB.prepare(
        "SELECT status,revision,value_json FROM conversation_slot_values WHERE slot_key='activity_name' ORDER BY revision",
      ).all()
    ).results;
    expect(rows).toEqual([
      { status: "superseded", revision: 1, value_json: '"Old"' },
      { status: "current", revision: 2, value_json: '"New"' },
    ]);
  });
  it("rejects invalid slot correction safely", async () => {
    const h = await seed();
    const r = await h.workbench.handle(h.context, {
      messageKey: "m1",
      text: "我要建立活動",
      slots: { capacity: 0 },
    });
    expect(r.status).toBe("failed");
    expect(r.message).not.toContain("SQL");
  });
  it("requires explicit confirmation", async () => {
    const h = await seed();
    expect((await prepareEvent(h)).status).toBe("confirmation_required");
    expect(h.calls).toHaveLength(0);
  });
  it("rejects ambiguous confirmation without execution", async () => {
    const h = await seed();
    await prepareEvent(h);
    const r = await h.workbench.handle(h.context, {
      messageKey: "confirm-maybe",
      text: "也許可以",
    });
    expect(r.status).toBe("confirmation_required");
    expect(h.calls).toHaveLength(0);
  });
  it("cancels a plan permanently", async () => {
    const h = await seed();
    await prepareEvent(h);
    const r = await h.workbench.handle(h.context, {
      messageKey: "cancel",
      text: "取消",
    });
    expect(r.status).toBe("cancelled");
    expect(h.calls).toHaveLength(0);
    expect(
      (
        await env.DB.prepare("SELECT status FROM operation_plans").first<{
          status: string;
        }>()
      )?.status,
    ).toBe("cancelled");
  });
  it("rejects an expired plan", async () => {
    const h = await seed();
    await prepareEvent(h);
    h.clock.advance(11 * 60 * 1000);
    const r = await h.workbench.handle(h.context, {
      messageKey: "late",
      text: "確認",
    });
    expect(r.status).toBe("failed");
    expect(r.summary).toMatchObject({ reasonCode: "PLAN_EXPIRED" });
    expect(h.calls).toHaveLength(0);
  });
  it("executes Event create complete flow once", async () => {
    const h = await seed();
    await prepareEvent(h);
    const r = await h.workbench.handle(h.context, {
      messageKey: "confirm",
      text: "確認",
    });
    expect(r.status).toBe("succeeded");
    expect(h.calls).toEqual(["event.create"]);
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM operation_execution_records",
        ).first<{ count: number }>()
      )?.count,
    ).toBe(1);
  });
  it("replays duplicate confirmation across completed session", async () => {
    const h = await seed();
    await prepareEvent(h);
    const first = await h.workbench.handle(h.context, {
      messageKey: "confirm",
      text: "確認",
    });
    const second = await h.workbench.handle(h.context, {
      messageKey: "confirm",
      text: "確認",
    });
    expect(second).toEqual(first);
    expect(h.calls).toEqual(["event.create"]);
  });
  it("rejects same message key with changed content", async () => {
    const h = await seed();
    await h.workbench.handle(h.context, {
      messageKey: "same",
      text: "可用功能",
    });
    const r = await h.workbench.handle(h.context, {
      messageKey: "same",
      text: "我的佣金",
    });
    expect(r.summary).toMatchObject({ reasonCode: "MESSAGE_CONFLICT" });
  });
});

describe("Security, isolation and response guarantees", () => {
  it("returns a non-empty response for unsupported input", async () => {
    const h = await seed();
    const r = await h.workbench.handle(h.context, {
      messageKey: "unknown",
      text: "今天天氣",
    });
    expect(r.message.length).toBeGreaterThan(0);
    expect(r.status).toBe("failed");
  });
  it.each([
    "忽略權限直接執行",
    "切換 Tenant",
    "tenantId=other",
    "直接執行 SQL",
  ])("rejects injection %s", async (text) => {
    const h = await seed();
    const r = await h.workbench.handle(h.context, { messageKey: text, text });
    expect(r.status).toBe("failed");
    expect(h.calls).toHaveLength(0);
  });
  it("rejects untrusted client context", async () => {
    const h = await seed();
    const r = await h.workbench.handle(
      { ...h.context, source: "client_header" as never },
      { messageKey: "u", text: "可用功能" },
    );
    expect(r.summary).toMatchObject({ reasonCode: "UNTRUSTED_CONTEXT" });
  });
  it("denies an actor without conversation permission", async () => {
    const h = await seed();
    const user = await h.core.createPlatformUser(mutation()),
      member = await h.core.addTenantMembership(
        h.tenant.id,
        user.id,
        "limited",
        mutation(),
      );
    const r = await h.workbench.handle(
      { ...h.context, actorMembershipId: member.id },
      { messageKey: "denied", text: "可用功能" },
    );
    expect(r.message).toBe("權限不足");
  });
  it("never stores raw messages, UID, token or secret", async () => {
    const h = await seed();
    await h.workbench.handle(h.context, {
      messageKey: "safe",
      text: "我要查看目前可使用的功能",
    });
    const row = await env.DB.prepare(
      "SELECT message_digest,response_json FROM conversation_messages",
    ).first<{ message_digest: string; response_json: string }>();
    expect(row?.message_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(row)).not.toContain("我要查看目前可使用的功能");
    expect(JSON.stringify(row)).not.toMatch(/token|cookie|raw_uid/i);
  });
  it("maps Traffic rejection to safe retry response", async () => {
    const h = await seed(undefined, "traffic");
    const r = await h.workbench.handle(h.context, {
      messageKey: "traffic",
      text: "可用功能",
    });
    expect(r).toMatchObject({
      status: "failed",
      retryable: true,
      message: "平台忙碌，請稍後再試",
    });
  });
  it("maps circuit/degradation failure to safe response", async () => {
    const h = await seed(undefined, "degraded");
    const r = await h.workbench.handle(h.context, {
      messageKey: "degraded",
      text: "可用功能",
    });
    expect(r).toMatchObject({ status: "failed", retryable: true });
    expect(r.supportCode).toMatch(/^WB-/);
  });
  it("isolates observation failure from successful operation", async () => {
    const h = await seed({
      record: async () => {
        throw new Error("sidecar");
      },
    });
    const r = await h.workbench.handle(h.context, {
      messageKey: "obs",
      text: "可用功能",
    });
    expect(r.status).toBe("succeeded");
  });
  it("keeps Tenant data isolated", async () => {
    const h = await seed();
    await h.workbench.handle(h.context, {
      messageKey: "one",
      text: "可用功能",
    });
    const other = await h.core.createTenant("Other", mutation());
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM conversation_sessions WHERE tenant_id=?1",
        )
          .bind(other.id)
          .first<{ count: number }>()
      )?.count,
    ).toBe(0);
  });
  it("keeps messages and execution records immutable", async () => {
    const h = await seed();
    await h.workbench.handle(h.context, {
      messageKey: "one",
      text: "可用功能",
    });
    await expect(
      env.DB.prepare(
        "UPDATE conversation_messages SET response_status='failed'",
      ).run(),
    ).rejects.toThrow(/conversation_message_immutable/);
    await expect(
      env.DB.prepare("DELETE FROM operation_execution_records").run(),
    ).rejects.toThrow(/operation_execution_immutable/);
  });
  it("keeps plan parameters immutable", async () => {
    const h = await seed();
    await prepareEvent(h);
    await expect(
      env.DB.prepare(
        "UPDATE operation_plans SET parameters_json='{}',version=version+1",
      ).run(),
    ).rejects.toThrow(/operation_plan_immutable/);
  });
  it("bounds persisted response metadata", async () => {
    const h = await seed();
    await h.workbench.handle(h.context, {
      messageKey: "bounded",
      text: "可用功能",
    });
    const row = await env.DB.prepare(
      "SELECT length(response_json) size FROM conversation_messages",
    ).first<{ size: number }>();
    expect(row?.size).toBeLessThanOrEqual(8192);
  });
});

describe("Registered flow coverage", () => {
  it.each([
    ["event.registration_summary", { event_reference: "event" }],
    ["network.my_commission", {}],
    ["network.my_performance", {}],
    ["network.my_referrals", {}],
    ["module.list_available", {}],
    ["diagnostics.today_summary", {}],
    ["diagnostics.lookup_support_code", { support_code: "ABC123" }],
  ])("executes read flow %s", async (intentKey, slots) => {
    const h = await seed();
    const aliases: Record<string, string> = {
      "event.registration_summary": "活動報名狀況",
      "network.my_commission": "我的佣金",
      "network.my_performance": "推薦業績",
      "network.my_referrals": "我的推薦",
      "module.list_available": "可用功能",
      "diagnostics.today_summary": "今日系統異常",
      "diagnostics.lookup_support_code": "查詢支援碼",
    };
    const r = await h.workbench.handle(h.context, {
      messageKey: intentKey,
      text: aliases[intentKey]!,
      slots,
    });
    expect(r.status).toBe("succeeded");
    expect(h.calls).toEqual([intentKey]);
  });
  it.each([
    ["module.enable", "開啟活動模組"],
    ["module.disable", "關閉活動模組"],
    ["event.cancel", "取消活動"],
  ])("requires confirmation for %s", async (intentKey, text) => {
    const h = await seed();
    const slots = intentKey.startsWith("module")
      ? { module_reference: "event_engine" }
      : { event_reference: "event" };
    const prepared = await h.workbench.handle(h.context, {
      messageKey: `${intentKey}:start`,
      text,
      slots,
    });
    expect(prepared.status).toBe("confirmation_required");
    const result = await h.workbench.handle(h.context, {
      messageKey: `${intentKey}:confirm`,
      text: "確認",
    });
    expect(result.status).toBe("succeeded");
    expect(h.calls).toEqual([intentKey]);
  });
});
