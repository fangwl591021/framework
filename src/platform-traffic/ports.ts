import type {
  AdmissionSheddingDecision,
  CircuitBreakerDecision,
  ResourceIsolationDecision,
  TrafficObservation,
  TrustedAdmissionContext,
  WebhookEventFingerprint,
  WebhookReplayResult,
  RateLimitDecision,
} from "./models";

export interface WebhookDeduplicationPort {
  claim(fingerprint: WebhookEventFingerprint): Promise<WebhookReplayResult>;
  complete(
    receiptId: string,
    leaseToken: string,
    safeResult: Readonly<Record<string, string | number | boolean | null>>,
  ): Promise<void>;
}

export interface RateLimiterPort {
  evaluate(context: TrustedAdmissionContext): Promise<RateLimitDecision>;
}

export interface TenantResourceIsolationPort {
  evaluate(context: TrustedAdmissionContext): Promise<ResourceIsolationDecision>;
  release(leaseToken: string): Promise<void>;
}

export interface CircuitBreakerPort {
  evaluate(context: TrustedAdmissionContext): Promise<CircuitBreakerDecision>;
}

export interface LoadSheddingPort {
  evaluate(context: TrustedAdmissionContext): Promise<AdmissionSheddingDecision>;
}

export interface TrafficObservationPort {
  observe(event: TrafficObservation): Promise<void>;
}

export interface AdmissionModuleGatePort {
  assertEnabled(context: TrustedAdmissionContext): Promise<boolean>;
}

export interface AdmissionPermissionPort {
  assertGranted(context: TrustedAdmissionContext): Promise<boolean>;
}

export interface TrafficReadinessPort {
  snapshot(): Promise<Readonly<{
    emergency: boolean;
    reasonCode: string | null;
  }>>;
}
