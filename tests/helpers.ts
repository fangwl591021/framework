import type { Clock } from "../src/core/clock";
import type { UuidV7 } from "../src/core/uuidv7";

export class FixedClock implements Clock {
  constructor(private readonly value = "2026-07-30T00:00:00.000Z") {}

  now(): Date {
    return new Date(this.value);
  }
}

export class SequenceUuidV7 implements UuidV7 {
  private sequence = 0;

  generate(): string {
    this.sequence += 1;
    return `0198-0000-7000-8000-${this.sequence.toString().padStart(12, "0")}`;
  }
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
