import type { TrafficErrorCode } from "./models";

export class TrafficProtectionError extends Error {
  constructor(
    readonly code: TrafficErrorCode,
    readonly retryable: boolean,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(code);
    this.name = "TrafficProtectionError";
  }
}
