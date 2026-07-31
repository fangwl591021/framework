import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { AiProviderGovernanceService } from "../../src/ai-provider-governance/application";
import { DisabledProviderGovernanceObservationAdapter } from "../../src/ai-provider-governance/ports";
import { AiProviderGovernanceRepository } from "../../src/ai-provider-governance/repository";
import type { UuidV7 } from "../../src/core/uuidv7";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
let sequence = 9990;
const ids: UuidV7 = { generate: () => `019f0000-0000-7000-8000-${String(++sequence).padStart(12, "0")}` };

beforeEach(async () => {
  sequence = 9990;
  await reset();
  await applyD1Migrations(env.DB, [...migrations]);
});

describe("AI provider governance gate precedence", () => {
  it("applies the platform kill switch before deterministic execution", async () => {
    const repository = new AiProviderGovernanceRepository(env.DB);
    const service = new AiProviderGovernanceService(repository, ids, new DisabledProviderGovernanceObservationAdapter(), () => 1);
    await service.setKillSwitch(
      { source: "platform_operator_context", actorReference: "local-operator", permissions: ["ai_provider_kill_switch:manage"], correlationId: "kill-switch-test" },
      { environment: "local", scopeType: "platform", scopeKey: "platform", state: "disabled", expectedVersion: 0, reason: "local-drill", idempotencyKey: "platform-kill-test" },
    );

    await expect(repository.authorize({
      providerKey: "deterministic_local_adapter",
      modelKey: "deterministic-fixture",
      modelVersion: "1",
      taskKey: "content.safe_rewrite",
      taskVersion: 1,
      environment: "local",
      tenantId: "tenant-a",
      applicationId: "application-a",
      sensitivity: "internal",
      inputUnits: 1,
      outputUnits: 1,
      estimatedCostMicros: 0,
      interactive: true,
    })).rejects.toMatchObject({ code: "AI_PROVIDER_KILLED" });
  });
});
