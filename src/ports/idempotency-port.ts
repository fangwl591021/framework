export interface IdempotencyClaim {
  readonly operationScope: string;
  readonly key: string;
  readonly fingerprint: string;
}

export interface IdempotencyPort {
  claim(intent: IdempotencyClaim): Promise<never>;
}
