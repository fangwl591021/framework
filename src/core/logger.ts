export interface RuntimeLogEvent {
  readonly code: "UNHANDLED_RUNTIME_ERROR";
  readonly correlationId: string;
  readonly method: string;
  readonly pathname: string;
}

export interface RuntimeLogger {
  error(event: RuntimeLogEvent, cause: unknown): void;
}

export class NoopRuntimeLogger implements RuntimeLogger {
  error(_event: RuntimeLogEvent, _cause: unknown): void {
    // Intentionally disabled: this Foundation has no persistent log adapter.
  }
}
