import type { AiTaskKey, TrustedAiContext } from "../ai-gateway/models";
import { assertExactKeys } from "./security";
import type { DemoFixtureState } from "./seed";

export const AI_LAB_SCENARIOS = [
  "deterministic_shortcut_hit",
  "cache_miss_local_provider_success",
  "cache_hit",
  "cache_expired",
  "cross_tenant_cache_isolation",
  "retired_task_cache_rejected",
  "budget_exceeded",
  "provider_disabled",
  "provider_timeout",
  "fallback_to_deterministic_local",
  "invalid_structured_output",
  "unsafe_output",
  "low_confidence",
  "unallowlisted_intent",
  "circuit_open",
  "stale_provider_completion",
  "idempotent_replay",
  "request_conflict",
] as const;
export type AiLabScenario = (typeof AI_LAB_SCENARIOS)[number];

export const AI_LAB_BUDGET_FIXTURES = [
  "generous",
  "tight",
  "exhausted",
  "concurrency_limited",
  "premium_blocked",
] as const;
export type AiLabBudgetFixture = (typeof AI_LAB_BUDGET_FIXTURES)[number];

export const AI_LAB_TASKS: readonly AiTaskKey[] = [
  "workbench.intent_resolution",
  "workbench.clarification_suggestion",
  "diagnostics.safe_summary",
  "content.safe_rewrite",
  "content.translation",
];

export type LocalFixtureKey =
  | "owner_a"
  | "owner_b"
  | "owner_tenant_b"
  | "member_a"
  | "operator_a";

export interface AiLabTrustedContext extends TrustedAiContext {
  readonly actorFixture: LocalFixtureKey;
  readonly platformAggregateAllowed: boolean;
}

export interface AiLabSimulationInput {
  readonly taskKey: AiTaskKey;
  readonly scenario: AiLabScenario;
  readonly budgetFixture: AiLabBudgetFixture;
  readonly cacheDirective: "allow" | "bypass";
  readonly text: string;
  readonly idempotencyKey: string;
}

export interface AiLabTimelineEntry {
  readonly stage: string;
  readonly outcome: "completed" | "skipped" | "rejected" | "failed";
  readonly reasonCode: string;
}

const simulationKeys = new Set([
  "taskKey",
  "scenario",
  "budgetFixture",
  "cacheDirective",
  "text",
  "idempotencyKey",
]);

export function parseAiLabSimulation(
  value: Readonly<Record<string, unknown>>,
): AiLabSimulationInput {
  assertExactKeys(value, simulationKeys);
  if (!AI_LAB_TASKS.includes(value.taskKey as AiTaskKey))
    throw new TypeError("TASK_NOT_ALLOWED");
  if (!AI_LAB_SCENARIOS.includes(value.scenario as AiLabScenario))
    throw new TypeError("SCENARIO_NOT_ALLOWED");
  if (
    !AI_LAB_BUDGET_FIXTURES.includes(
      value.budgetFixture as AiLabBudgetFixture,
    )
  )
    throw new TypeError("BUDGET_FIXTURE_NOT_ALLOWED");
  if (value.cacheDirective !== "allow" && value.cacheDirective !== "bypass")
    throw new TypeError("CACHE_DIRECTIVE_NOT_ALLOWED");
  if (typeof value.text !== "string" || value.text.length > 2000)
    throw new TypeError("INPUT_INVALID");
  if (
    typeof value.idempotencyKey !== "string" ||
    value.idempotencyKey.length < 8 ||
    value.idempotencyKey.length > 120
  )
    throw new TypeError("IDEMPOTENCY_KEY_INVALID");
  return {
    taskKey: value.taskKey as AiTaskKey,
    scenario: value.scenario as AiLabScenario,
    budgetFixture: value.budgetFixture as AiLabBudgetFixture,
    cacheDirective: value.cacheDirective,
    text: value.text,
    idempotencyKey: value.idempotencyKey,
  };
}

export function aiLabContext(
  fixture: DemoFixtureState,
  actorFixture: LocalFixtureKey,
): AiLabTrustedContext {
  const tenantB = actorFixture === "owner_tenant_b";
  const member = tenantB
    ? fixture.tenantBOwnerMembership
    : actorFixture === "member_a"
      ? fixture.memberMembership
      : actorFixture === "operator_a"
        ? fixture.operatorMembership
        : fixture.ownerMembership;
  return {
    source: "trusted_runtime_context",
    tenantId: tenantB ? fixture.tenantB : fixture.tenantA,
    applicationId: tenantB
      ? fixture.tenantBApp
      : actorFixture === "owner_b"
        ? fixture.appB
        : fixture.appA,
    actorMembershipId: member,
    correlationId: `local-ai-lab-${crypto.randomUUID()}`,
    permissionGranted: actorFixture !== "member_a",
    moduleEnabled: true,
    trafficAdmitted: true,
    actorFixture,
    platformAggregateAllowed: actorFixture === "operator_a",
  };
}

export function timelineEntry(
  stage: string,
  outcome: AiLabTimelineEntry["outcome"] = "completed",
  reasonCode = "OK",
): AiLabTimelineEntry {
  return { stage, outcome, reasonCode };
}
