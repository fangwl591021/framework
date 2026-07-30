import type { UuidV7 } from "./uuidv7";

export const CORRELATION_ID_HEADER = "x-correlation-id";
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export function isValidCorrelationId(value: string): boolean {
  return CORRELATION_ID_PATTERN.test(value);
}

export function resolveCorrelationId(headers: Headers, uuidv7: UuidV7): string {
  const candidate = headers.get(CORRELATION_ID_HEADER);
  return candidate !== null && isValidCorrelationId(candidate)
    ? candidate
    : uuidv7.generate();
}
