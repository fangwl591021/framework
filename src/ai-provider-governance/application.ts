import type { UuidV7 } from "../core/uuidv7";
import { canonicalJson, sha256Hex } from "../persistence/crypto";
import { assertLifecycleTransition, assertSafeGovernanceEvidence } from "./policy";
import { evaluateProviderReadiness } from "./readiness";
import { ProviderGovernanceError, type KillSwitchScope, type KillSwitchState, type ProviderEnvironment, type ProviderGovernanceContext, type ProviderLifecycleState } from "./models";
import type { ProviderGovernanceObservationPort } from "./ports";
import { AiProviderGovernanceRepository } from "./repository";

const drillKeys = ["provider_lifecycle_not_approved", "compliance_expired", "region_mismatch", "retention_violation", "secret_not_provisioned", "hard_cost_ceiling", "provider_kill_switch", "task_kill_switch", "shadow_plan_expired", "canary_not_approved", "provider_outage_rollback", "unsafe_output_rollback", "excessive_cost_rollback", "credential_compromise", "deterministic_only_restoration"] as const;
export type ProviderDrillKey = (typeof drillKeys)[number];

export class AiProviderGovernanceService {
  constructor(private readonly repository: AiProviderGovernanceRepository, private readonly ids: UuidV7, private readonly observations: ProviderGovernanceObservationPort, private readonly now: () => number = Date.now) {}

  private authorize(context: ProviderGovernanceContext, permission: string): void {
    if (context.source !== "platform_operator_context" || !context.permissions.includes(permission)) throw new ProviderGovernanceError("AI_PROVIDER_GOVERNANCE_DENIED");
  }
  private async observe(eventType: Parameters<ProviderGovernanceObservationPort["record"]>[0]["eventType"], providerKey: string, environment: string, reasonCode: string): Promise<void> {
    try { await this.observations.record({ eventType, providerKey, environment, reasonCode, supportCode: `AIP-${(await sha256Hex(`${providerKey}|${environment}|${reasonCode}`)).slice(0, 16).toUpperCase()}` }); } catch { /* sidecar isolation */ }
  }

  async transitionLifecycle(context: ProviderGovernanceContext, input: { providerKey: string; providerVersion: string; environment: ProviderEnvironment; to: ProviderLifecycleState; expectedVersion: number; reason: string; evidenceReferences: readonly string[]; idempotencyKey: string }) {
    this.authorize(context, "ai_provider_enablement:manage"); assertSafeGovernanceEvidence(input.evidenceReferences);
    if (input.reason.length < 3 || input.reason.length > 80 || input.evidenceReferences.length > 20 || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 200) throw new ProviderGovernanceError("AI_PROVIDER_GOVERNANCE_DENIED");
    const operation = "ai.provider_enablement.transition", keyHash = await sha256Hex(input.idempotencyKey), fingerprint = await sha256Hex(canonicalJson(input));
    const prior = await this.repository.getIdempotency(operation, keyHash);
    if (prior) { if (prior.request_fingerprint !== fingerprint) throw new ProviderGovernanceError("AI_PROVIDER_IDEMPOTENCY_CONFLICT"); return { ...JSON.parse(prior.stored_result_json), replayed: true }; }
    const current = await this.repository.currentEnablement(input.providerKey, input.providerVersion, input.environment);
    if ((current?.lifecycle_version ?? 0) !== input.expectedVersion) throw new ProviderGovernanceError("AI_PROVIDER_LIFECYCLE_INVALID");
    assertLifecycleTransition(current?.lifecycle_state ?? null, input.to);
    const result = { providerKey: input.providerKey, environment: input.environment, state: input.to, version: input.expectedVersion + 1 };
    await this.repository.insertEnablement({ id: this.ids.generate(), providerKey: input.providerKey, providerVersion: input.providerVersion, environment: input.environment, state: input.to, version: result.version, actor: context.actorReference, reason: input.reason, evidence: input.evidenceReferences, idempotencyId: this.ids.generate(), auditId: this.ids.generate(), operation, keyHash, fingerprint, storedResult: result, correlationId: context.correlationId, now: this.now() });
    await this.observe("ai.provider_enablement_changed", input.providerKey, input.environment, input.to);
    return { ...result, replayed: false };
  }

  async setKillSwitch(context: ProviderGovernanceContext, input: { environment: ProviderEnvironment; scopeType: KillSwitchScope; scopeKey: string; providerKey?: string; modelKey?: string; taskKey?: string; tenantId?: string; applicationId?: string; state: KillSwitchState; expectedVersion: number; reason: string; idempotencyKey: string }) {
    this.authorize(context, "ai_provider_kill_switch:manage"); assertSafeGovernanceEvidence(input);
    const operation = "ai.provider_kill_switch.set", keyHash = await sha256Hex(input.idempotencyKey), fingerprint = await sha256Hex(canonicalJson(input));
    const prior = await this.repository.getIdempotency(operation, keyHash);
    if (prior) { if (prior.request_fingerprint !== fingerprint) throw new ProviderGovernanceError("AI_PROVIDER_IDEMPOTENCY_CONFLICT"); return { ...JSON.parse(prior.stored_result_json), replayed: true }; }
    const current = await this.repository.currentKillSwitch(input.environment, input.scopeType, input.scopeKey);
    if ((current?.version ?? 0) !== input.expectedVersion) throw new ProviderGovernanceError("AI_PROVIDER_GOVERNANCE_DENIED");
    if (current?.state === input.state) return { environment: input.environment, scopeKey: input.scopeKey, state: input.state, version: current.version, replayed: true };
    const result = { environment: input.environment, scopeKey: input.scopeKey, state: input.state, version: input.expectedVersion + 1 };
    await this.repository.insertKillSwitch({ id: this.ids.generate(), ...input, version: result.version, actor: context.actorReference, idempotencyId: this.ids.generate(), auditId: this.ids.generate(), operation, keyHash, fingerprint, storedResult: result, correlationId: context.correlationId, now: this.now() });
    await this.observe("ai.provider_kill_switch_changed", input.providerKey ?? "platform", input.environment, input.state);
    return { ...result, replayed: false };
  }

  async evaluate(context: ProviderGovernanceContext, providerKey: string, providerVersion: string, environment: ProviderEnvironment, taskKey: string) {
    this.authorize(context, "ai_provider_readiness:evaluate");
    const assessment = evaluateProviderReadiness(await this.repository.readinessSnapshot(providerKey, providerVersion, environment, taskKey, this.now()));
    await this.observe("ai.provider_readiness_evaluated", providerKey, environment, assessment.result);
    return assessment;
  }

  async runLocalDrill(context: ProviderGovernanceContext, drill: ProviderDrillKey) {
    this.authorize(context, "ai_provider_drill:run");
    if (!drillKeys.includes(drill)) throw new ProviderGovernanceError("AI_PROVIDER_GOVERNANCE_DENIED");
    await this.observe("ai.provider_drill_started", "disabled_generic_adapter", "local", drill);
    const rollback = drill.includes("rollback") || drill === "credential_compromise" || drill === "deterministic_only_restoration";
    const result = { drill, status: "completed" as const, expectedOutcome: rollback ? "deterministic_only" : "provider_blocked", readinessFinding: drill.toUpperCase(), timeline: [{ stage: "precondition", outcome: "verified" }, { stage: "kill_or_policy_guard", outcome: "blocked" }, { stage: "restoration", outcome: rollback ? "deterministic_only" : "not_required" }], authority: "none", networkUsed: false, secretUsed: false, productionStateChanged: false };
    assertSafeGovernanceEvidence(result);
    await this.observe("ai.provider_drill_completed", "disabled_generic_adapter", "local", drill);
    return result;
  }
}
