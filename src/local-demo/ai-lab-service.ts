import {
  DisabledGenericProviderAdapter,
  DisabledOpenAiAdapter,
} from "../ai-gateway/adapters";
import {
  AiGatewayService,
  type AiExecutionResult,
} from "../ai-gateway/application";
import {
  AiGatewayError,
  type AiProviderRequest,
  type AiProviderResult,
  type AiRoute,
  type PrepareAiRequestInput,
} from "../ai-gateway/models";
import type { AiProviderPort } from "../ai-gateway/ports";
import { DisabledAiGatewayObservationAdapter } from "../ai-gateway/ports";
import { AiGatewayRepository } from "../ai-gateway/repository";
import { DeterministicIntentResolver } from "../conversational-workbench/resolver";
import { UuidV7Generator } from "../core/uuidv7";
import { canonicalJson, sha256Hex } from "../persistence/crypto";
import {
  type AiLabSimulationInput,
  type AiLabTimelineEntry,
  type AiLabTrustedContext,
  aiLabContext,
  timelineEntry,
} from "./ai-lab-models";
import { LocalAiLabRepository } from "./ai-lab-repository";
import type { DemoFixtureState } from "./seed";

const localIntent = (text: string) => {
  const normalized = text.normalize("NFKC").trim().toLowerCase();
  const candidates: readonly [RegExp, string][] = [
    [/\u5efa\u7acb\u6d3b\u52d5|\u8fa6\u6d3b\u52d5|create event/, "event.create"],
    [/\u6d3b\u52d5\u5217\u8868|list events/, "event.list"],
    [/\u5831\u540d|registration/, "event.registration_summary"],
    [/\u4f63\u91d1|commission/, "network.my_commission"],
    [/\u696d\u7e3e|performance/, "network.my_performance"],
    [/\u63a8\u85a6|referral/, "network.my_referrals"],
    [/\u7cfb\u7d71.*\u554f\u984c|\u7cfb\u7d71.*\u7570\u5e38|diagnostic/, "diagnostics.today_summary"],
    [/support/, "diagnostics.lookup_support_code"],
    [/\u555f\u7528.*\u6a21\u7d44|enable.*module/, "module.enable"],
    [/\u505c\u7528.*\u6a21\u7d44|disable.*module/, "module.disable"],
  ];
  return candidates.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
};

class LocalShadowAdapter implements AiProviderPort {
  readonly providerKey = "deterministic_local_adapter";
  readonly enabled = true;

  async invoke(request: AiProviderRequest): Promise<AiProviderResult> {
    const text = String(request.input.text ?? "");
    if (request.taskKey === "workbench.intent_resolution") {
      const intentKey = localIntent(text);
      const output = {
        intentKey,
        confidence: intentKey ? 0.91 : 0.35,
        choices: intentKey ? [] : ["event.create", "network.my_commission"],
      };
      return {
        output,
        inputUnits: Math.max(1, text.length),
        outputUnits: JSON.stringify(output).length,
        latencyMs: 1,
      };
    }
    const output = { text: text.slice(0, request.maxOutputUnits) };
    return {
      output,
      inputUnits: Math.max(1, text.length),
      outputUnits: JSON.stringify(output).length,
      latencyMs: 1,
    };
  }
}

class FailingPrimaryAdapter implements AiProviderPort {
  readonly providerKey = "disabled_generic_adapter";
  readonly enabled = true;
  async invoke(): Promise<AiProviderResult> {
    throw new AiGatewayError("AI_PROVIDER_FAILED");
  }
}

const reasonOf = (error: unknown) =>
  error instanceof AiGatewayError
    ? error.code
    : error instanceof Error && /^[A-Z0-9_]{3,80}$/.test(error.message)
      ? error.message
      : "LOCAL_SIMULATION_FAILED";

const qualityFor = (taskKey: string) =>
  taskKey.startsWith("workbench.") ? "deterministic" : "standard";

export class LocalAiLabService {
  private readonly repository: LocalAiLabRepository;
  private readonly ids = new UuidV7Generator();
  private readonly resolver = new DeterministicIntentResolver();

  constructor(
    private readonly db: D1Database,
    private readonly fixture: DemoFixtureState,
    private readonly now: () => number = Date.now,
  ) {
    this.repository = new LocalAiLabRepository(db);
  }

  private gateway(primaryFails = false) {
    const providers: AiProviderPort[] = [
      new LocalShadowAdapter(),
      new DisabledOpenAiAdapter(),
      primaryFails
        ? new FailingPrimaryAdapter()
        : new DisabledGenericProviderAdapter(),
    ];
    return new AiGatewayService(
      new AiGatewayRepository(this.db),
      this.ids,
      new Map(providers.map((provider) => [provider.providerKey, provider])),
      new DisabledAiGatewayObservationAdapter(),
      this.now,
    );
  }

  private formalInput(
    context: AiLabTrustedContext,
    input: AiLabSimulationInput,
    text: string,
    idempotencyKey: string,
    nonce: string,
  ): PrepareAiRequestInput {
    return {
      context,
      taskKey: input.taskKey,
      taskVersion: 1,
      input: { text, labNonce: nonce },
      idempotencyKey,
      locale: "zh-TW",
      qualityTier: qualityFor(input.taskKey),
      cacheDirective: input.cacheDirective,
      requestedOutputUnits: 128,
      requestedCostMicros: 0,
    };
  }

  async simulate(context: AiLabTrustedContext, input: AiLabSimulationInput) {
    if (!context.permissionGranted) throw new AiGatewayError("AI_PERMISSION_DENIED");
    const fingerprint = canonicalJson({
      taskKey: input.taskKey,
      scenario: input.scenario,
      budgetFixture: input.budgetFixture,
      cacheDirective: input.cacheDirective,
      text: input.text,
    });
    const [inputDigest, idempotencyDigest] = await Promise.all([
      sha256Hex(fingerprint),
      sha256Hex(input.idempotencyKey),
    ]);
    const replay = await this.repository.replay(
      context,
      input.taskKey,
      idempotencyDigest,
    );
    if (replay) {
      if (replay.inputDigest !== inputDigest)
        throw new AiGatewayError("AI_IDEMPOTENCY_CONFLICT");
      const { inputDigest: _hidden, ...safeReplay } = replay;
      return { ...safeReplay, replayed: true };
    }

    const requestId = this.ids.generate();
    const supportCode = `AIL-${(await sha256Hex(requestId)).slice(0, 16).toUpperCase()}`;
    const timeline: AiLabTimelineEntry[] = [
      timelineEntry("request_received"),
      timelineEntry("traffic_admitted"),
    ];
    const deterministic = await this.resolver.resolve(input.text);
    let shadowIntent: string | null = null;
    let shadowConfidence = 0;
    let status: "completed" | "rejected" | "failed" | "fallback" | "cached" =
      "completed";
    let validation = "accepted";
    let reasonCode = "AI_COMPLETED";
    let route: AiRoute | null = null;
    let fallbackChain: readonly string[] = [];
    let formalResult: AiExecutionResult | null = null;
    const nonce = idempotencyDigest.slice(0, 16);
    const gateway = this.gateway(
      input.scenario === "provider_timeout" ||
        input.scenario === "fallback_to_deterministic_local",
    );

    try {
      await this.repository.applyBudgetFixture(
        context,
        input.budgetFixture,
        this.now(),
      );
      switch (input.scenario) {
        case "deterministic_shortcut_hit": {
          timeline.push(timelineEntry("policy_evaluated"));
          const shortcutInput = this.formalInput(
            context,
            { ...input, taskKey: "workbench.clarification_suggestion" },
            "",
            input.idempotencyKey,
            nonce,
          );
          formalResult = await gateway.execute(shortcutInput);
          timeline.push(
            timelineEntry("budget_claimed"),
            timelineEntry("cache_checked", "completed", formalResult.cacheOutcome),
            timelineEntry("shortcut_checked", "completed", "DETERMINISTIC_RULE"),
          );
          route = {
            providerKey: formalResult.providerKey,
            modelKey: formalResult.modelKey,
            modelVersion: "1",
          };
          break;
        }
        case "cache_hit": {
          const formal = this.formalInput(
            context,
            input,
            input.text,
            `${input.idempotencyKey}:warm`,
            nonce,
          );
          timeline.push(timelineEntry("policy_evaluated"));
          await gateway.execute(formal);
          formalResult = await gateway.execute({
            ...formal,
            idempotencyKey: input.idempotencyKey,
          });
          status = "cached";
          reasonCode = "AI_CACHE_HIT";
          timeline.push(
            timelineEntry("budget_claimed"),
            timelineEntry("shortcut_checked", "skipped", "NO_SHORTCUT"),
            timelineEntry("cache_checked", "completed", "HIT"),
          );
          route = {
            providerKey: formalResult.providerKey,
            modelKey: formalResult.modelKey,
            modelVersion: "1",
          };
          break;
        }
        case "cache_expired": {
          const formal = this.formalInput(
            context,
            input,
            input.text,
            `${input.idempotencyKey}:warm`,
            nonce,
          );
          await gateway.execute(formal);
          const formalDigest = await sha256Hex(canonicalJson(formal.input));
          await this.repository.expireCache(
            context,
            input.taskKey,
            formalDigest,
            this.now(),
          );
          formalResult = await gateway.execute({
            ...formal,
            idempotencyKey: input.idempotencyKey,
          });
          reasonCode = "AI_CACHE_EXPIRED_MISS";
          timeline.push(
            timelineEntry("policy_evaluated"),
            timelineEntry("budget_claimed"),
            timelineEntry("shortcut_checked", "skipped", "NO_SHORTCUT"),
            timelineEntry("cache_checked", "completed", "EXPIRED_MISS"),
            timelineEntry("route_selected"),
            timelineEntry("provider_started"),
            timelineEntry("provider_completed"),
          );
          route = {
            providerKey: formalResult.providerKey,
            modelKey: formalResult.modelKey,
            modelVersion: "1",
          };
          break;
        }
        case "cross_tenant_cache_isolation": {
          const tenantB = aiLabContext(this.fixture, "owner_tenant_b");
          await this.repository.applyBudgetFixture(tenantB, "generous", this.now());
          const formalA = this.formalInput(
            context,
            input,
            input.text,
            `${input.idempotencyKey}:tenant-a`,
            nonce,
          );
          const formalB = this.formalInput(
            tenantB,
            input,
            input.text,
            `${input.idempotencyKey}:tenant-b`,
            nonce,
          );
          await gateway.execute(formalA);
          formalResult = await gateway.execute(formalB);
          reasonCode = "AI_CACHE_TENANT_ISOLATED";
          timeline.push(
            timelineEntry("policy_evaluated"),
            timelineEntry("budget_claimed"),
            timelineEntry("cache_checked", "completed", "TENANT_SCOPE_MISS"),
            timelineEntry("route_selected"),
            timelineEntry("provider_started"),
            timelineEntry("provider_completed"),
          );
          route = {
            providerKey: formalResult.providerKey,
            modelKey: formalResult.modelKey,
            modelVersion: "1",
          };
          break;
        }
        case "retired_task_cache_rejected": {
          await this.db
            .prepare(
              "UPDATE ai_task_registry SET status='retired',updated_at=?1 WHERE task_key=?2 AND task_version=1",
            )
            .bind(this.now(), input.taskKey)
            .run();
          try {
            await gateway.execute(
              this.formalInput(
                context,
                input,
                input.text,
                input.idempotencyKey,
                nonce,
              ),
            );
          } finally {
            await this.db
              .prepare(
                "UPDATE ai_task_registry SET status='active',updated_at=?1 WHERE task_key=?2 AND task_version=1",
              )
              .bind(this.now(), input.taskKey)
              .run();
          }
          break;
        }
        case "budget_exceeded": {
          await this.repository.applyBudgetFixture(context, "exhausted", this.now());
          timeline.push(timelineEntry("policy_evaluated"));
          await gateway.execute(
            this.formalInput(
              context,
              input,
              input.text,
              input.idempotencyKey,
              nonce,
            ),
          );
          break;
        }
        case "provider_disabled": {
          timeline.push(
            timelineEntry("policy_evaluated"),
            timelineEntry("route_selected"),
          );
          await gateway.invokeProvider(
            [
              {
                providerKey: "disabled_openai_adapter",
                modelKey: "disabled",
                modelVersion: "1",
              },
            ],
            {
              taskKey: input.taskKey,
              taskVersion: 1,
              input: { text: input.text },
              locale: "zh-TW",
              maxOutputUnits: 128,
              timeoutMs: 10,
            },
          );
          break;
        }
        case "provider_timeout": {
          timeline.push(
            timelineEntry("policy_evaluated"),
            timelineEntry("route_selected"),
            timelineEntry("provider_started"),
          );
          await gateway.invokeProvider(
            [
              {
                providerKey: "disabled_generic_adapter",
                modelKey: "disabled",
                modelVersion: "1",
              },
            ],
            {
              taskKey: input.taskKey,
              taskVersion: 1,
              input: { text: input.text },
              locale: "zh-TW",
              maxOutputUnits: 128,
              timeoutMs: 1,
            },
          );
          break;
        }
        case "fallback_to_deterministic_local": {
          timeline.push(
            timelineEntry("policy_evaluated"),
            timelineEntry("route_selected"),
            timelineEntry("provider_started", "failed", "LOCAL_TIMEOUT"),
            timelineEntry("provider_failed", "failed", "AI_PROVIDER_FAILED"),
            timelineEntry("fallback_started"),
          );
          const invoked = await gateway.invokeProvider(
            [
              {
                providerKey: "disabled_generic_adapter",
                modelKey: "disabled",
                modelVersion: "1",
              },
              {
                providerKey: "deterministic_local_adapter",
                modelKey: "deterministic-fixture",
                modelVersion: "1",
              },
            ],
            {
              taskKey: input.taskKey,
              taskVersion: 1,
              input: { text: input.text },
              locale: "zh-TW",
              maxOutputUnits: 128,
              timeoutMs: 10,
            },
          );
          const validated = gateway.validateOutput(
            input.taskKey,
            invoked.result.output,
            128,
          );
          shadowIntent =
            typeof validated.output.intentKey === "string"
              ? validated.output.intentKey
              : null;
          shadowConfidence = validated.confidence;
          route = invoked.route;
          fallbackChain = [
            "disabled_generic_adapter",
            "deterministic_local_adapter",
          ];
          status = "fallback";
          reasonCode = "AI_FALLBACK_COMPLETED";
          timeline.push(timelineEntry("provider_completed"));
          break;
        }
        case "invalid_structured_output":
          timeline.push(timelineEntry("policy_evaluated"));
          gateway.validateOutput(input.taskKey, { invalid: true }, 128);
          break;
        case "unsafe_output":
          timeline.push(timelineEntry("policy_evaluated"));
          gateway.validateOutput(
            input.taskKey,
            { text: "<script>unsafe</script>" },
            128,
          );
          break;
        case "unallowlisted_intent":
          timeline.push(timelineEntry("policy_evaluated"));
          gateway.validateOutput(
            "workbench.intent_resolution",
            { intentKey: "admin.root", confidence: 0.99, choices: [] },
            128,
          );
          break;
        case "circuit_open":
          status = "rejected";
          validation = "not_started";
          reasonCode = "AI_CIRCUIT_OPEN";
          timeline.push(
            timelineEntry("policy_evaluated"),
            timelineEntry("route_selected"),
            timelineEntry("request_failed", "rejected", "AI_CIRCUIT_OPEN"),
          );
          break;
        case "stale_provider_completion": {
          formalResult = await gateway.execute(
            this.formalInput(
              context,
              input,
              input.text,
              input.idempotencyKey,
              nonce,
            ),
          );
          const policy = await gateway.evaluateAiPolicy(
            context,
            input.taskKey,
            qualityFor(input.taskKey),
          );
          await new AiGatewayRepository(this.db).complete({
            usageId: this.ids.generate(),
            requestId: formalResult.requestId,
            tenantId: context.tenantId,
            applicationId: context.applicationId,
            actorMembershipId: context.actorMembershipId,
            taskKey: input.taskKey,
            route: {
              providerKey: formalResult.providerKey,
              modelKey: formalResult.modelKey,
              modelVersion: "1",
            },
            routePolicyId: policy.policyId,
            routePolicyVersion: policy.policyVersion,
            inputUnits: 1,
            outputUnits: 1,
            costMicros: 0,
            cacheOutcome: formalResult.cacheOutcome,
            latencyMs: 1,
            result: { status: "safe_summary_only" },
            now: this.now(),
          });
          break;
        }
        case "idempotent_replay": {
          const formal = this.formalInput(
            context,
            input,
            input.text,
            input.idempotencyKey,
            nonce,
          );
          const first = await gateway.execute(formal);
          const second = await gateway.execute(formal);
          if (first.requestId !== second.requestId)
            throw new Error("AI_REPLAY_DUPLICATED");
          formalResult = second;
          reasonCode = "AI_IDEMPOTENT_REPLAY";
          timeline.push(
            timelineEntry("policy_evaluated"),
            timelineEntry("budget_claimed"),
            timelineEntry("route_selected"),
            timelineEntry("provider_started"),
            timelineEntry("provider_completed"),
          );
          break;
        }
        case "request_conflict": {
          const formal = this.formalInput(
            context,
            input,
            input.text,
            input.idempotencyKey,
            nonce,
          );
          await gateway.execute(formal);
          await gateway.execute({
            ...formal,
            input: { text: `${input.text}-changed`, labNonce: nonce },
          });
          break;
        }
        case "low_confidence":
        case "cache_miss_local_provider_success": {
          const text =
            input.scenario === "low_confidence"
              ? "ambiguous unsupported local statement"
              : input.text;
          timeline.push(timelineEntry("policy_evaluated"));
          formalResult = await gateway.execute(
            this.formalInput(
              context,
              input,
              text,
              input.idempotencyKey,
              nonce,
            ),
          );
          reasonCode =
            input.scenario === "low_confidence"
              ? "AI_CLARIFICATION_REQUIRED"
              : "AI_LOCAL_PROVIDER_COMPLETED";
          timeline.push(
            timelineEntry("budget_claimed"),
            timelineEntry("shortcut_checked", "skipped", "NO_SHORTCUT"),
            timelineEntry("cache_checked", "completed", formalResult.cacheOutcome),
            timelineEntry("route_selected"),
            timelineEntry("provider_started"),
            timelineEntry("provider_completed"),
          );
          route = {
            providerKey: formalResult.providerKey,
            modelKey: formalResult.modelKey,
            modelVersion: "1",
          };
          break;
        }
      }
    } catch (error) {
      const reason = reasonOf(error);
      reasonCode = reason;
      validation = reason === "AI_OUTPUT_INVALID" ? "rejected" : validation;
      status = reason === "AI_PROVIDER_FAILED" ? "failed" : "rejected";
      const failureStage =
        reason === "AI_BUDGET_EXCEEDED"
          ? "budget_rejected"
          : reason === "AI_OUTPUT_INVALID"
            ? "output_rejected"
            : reason === "AI_PROVIDER_FAILED" || reason === "AI_PROVIDER_DISABLED"
              ? "provider_failed"
              : "request_failed";
      timeline.push(timelineEntry(failureStage, "rejected", reason));
    }

    if (formalResult) {
      const outputIntent = formalResult.output.intentKey;
      shadowIntent = typeof outputIntent === "string" ? outputIntent : null;
      shadowConfidence = formalResult.confidence;
      timeline.push(
        timelineEntry("output_validated"),
        timelineEntry("usage_completed"),
      );
    } else if (validation === "accepted" && status !== "rejected") {
      timeline.push(timelineEntry("output_validated"));
    }
    const terminalStage = timeline.at(-1)?.stage;
    if (
      ![
        "budget_rejected",
        "provider_failed",
        "output_rejected",
        "request_failed",
      ].includes(terminalStage ?? "")
    )
      timeline.push(
        timelineEntry(
          status === "failed" || status === "rejected"
            ? "request_failed"
            : "response_returned",
          status === "failed"
            ? "failed"
            : status === "rejected"
              ? "rejected"
              : "completed",
          reasonCode,
        ),
      );

    const usage = formalResult
      ? await this.repository.usageEvidence(context, formalResult.requestId)
      : null;
    const formalInputDigest = formalResult
      ? await sha256Hex(
          canonicalJson(
            this.formalInput(
              context,
              input,
              input.scenario === "low_confidence"
                ? "ambiguous unsupported local statement"
                : input.text,
              input.idempotencyKey,
              nonce,
            ).input,
          ),
        )
      : null;
    const cache = formalInputDigest
      ? await this.repository.cacheEvidence(
          context,
          input.taskKey,
          formalInputDigest,
        )
      : null;
    const budgets = await this.repository.budgets(context);
    const finalAuthority =
      deterministic.status === "resolved"
        ? "deterministic_only"
        : "clarification_required";
    const summary = {
      comparison: {
        deterministicIntent: deterministic.intentKey,
        deterministicConfidence: deterministic.confidence,
        shadowIntent,
        shadowConfidence,
        match:
          deterministic.intentKey !== null &&
          deterministic.intentKey === shadowIntent,
        finalAuthority,
      },
      route: {
        provider: route?.providerKey ?? null,
        model: route?.modelKey ?? null,
        fallbackChain,
        externalProvider: false,
      },
      budget: {
        fixture: input.budgetFixture,
        decision: timeline.some((entry) => entry.stage === "budget_rejected")
          ? "rejected"
          : "admitted",
        claimedUnits:
          Number(usage?.input_units ?? 0) + Number(usage?.output_units ?? 0),
        remainingUnits: budgets.map((level) => ({
          scope: level.scope_type,
          input: Math.max(
            0,
            Number(level.max_input_units) - Number(level.used_input_units),
          ),
          output: Math.max(
            0,
            Number(level.max_output_units) - Number(level.used_output_units),
          ),
        })),
        leaseExpiry: formalResult ? "released" : null,
        retryAfter: timeline.some((entry) => entry.stage === "budget_rejected")
          ? Math.min(...budgets.map((level) => Number(level.window_ends_at)))
          : null,
        levels: budgets,
      },
      providerAttempt: {
        attempted: timeline.some((entry) => entry.stage === "provider_started"),
        completed: timeline.some((entry) => entry.stage === "provider_completed"),
        failed: timeline.some((entry) => entry.stage === "provider_failed"),
        provider: route?.providerKey ?? null,
        model: route?.modelKey ?? null,
        fallbackHops: fallbackChain.length,
      },
      cache: cache ?? {
        keyDigestPrefix: null,
        scope: "tenant+application",
        status: "not_written",
        expiresAt: null,
        staleUntil: null,
        payloadSize: 0,
      },
      validation: { status: validation, reasonCode },
      usage: usage ?? {
        input_units: 0,
        output_units: 0,
        estimated_cost_micros: 0,
        outcome: status,
      },
      costLabel: "Estimate - Not Billing",
      authority: {
        final: finalAuthority,
        shadowCanCreatePlan: false,
        shadowCanInvokeTool: false,
        shadowCanMutate: false,
        shadowCanConfirm: false,
      },
    };
    await this.repository.saveEvidence({
      id: requestId,
      context,
      taskKey: input.taskKey,
      scenario: input.scenario,
      inputDigest,
      idempotencyDigest,
      status,
      supportCode,
      timeline,
      summary,
      now: this.now(),
    });
    return {
      requestId,
      status,
      supportCode,
      timeline,
      summary,
      replayed: false,
    };
  }

  catalog() {
    return this.repository.catalog();
  }
  tasks() {
    return this.repository.tasks();
  }
  policies(context: AiLabTrustedContext) {
    return this.repository.policies(context);
  }
  budgets(context: AiLabTrustedContext) {
    return this.repository.budgets(context);
  }
  listRequests(context: AiLabTrustedContext, before: number, limit: number) {
    return this.repository.listRequests(context, before, limit);
  }
  requestDetail(context: AiLabTrustedContext, requestId: string) {
    return this.repository.requestDetail(context, requestId);
  }
  usage(context: AiLabTrustedContext, from: number, until: number) {
    return this.repository.usage(context, from, until);
  }
  reset(context: AiLabTrustedContext) {
    return this.repository.reset(context, this.now());
  }
}
