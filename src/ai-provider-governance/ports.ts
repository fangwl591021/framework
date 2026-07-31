export type GovernanceObservationType =
  | "ai.provider_enablement_changed" | "ai.provider_compliance_expired" | "ai.provider_readiness_evaluated"
  | "ai.provider_kill_switch_changed" | "ai.shadow_plan_changed" | "ai.canary_plan_changed"
  | "ai.provider_approval_changed" | "ai.provider_drill_started" | "ai.provider_drill_completed" | "ai.provider_drill_failed";

export interface ProviderGovernanceObservationPort {
  record(event: Readonly<{ eventType: GovernanceObservationType; reasonCode: string; supportCode: string; providerKey: string; environment: string }>): Promise<void>;
}

export class DisabledProviderGovernanceObservationAdapter implements ProviderGovernanceObservationPort {
  async record(): Promise<void> {}
}
