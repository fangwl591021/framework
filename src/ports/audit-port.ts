export interface AuditIntent {
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly correlationId: string;
}

export interface AuditPort {
  record(intent: AuditIntent): Promise<void>;
}
