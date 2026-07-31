import { sha256Hex } from "../persistence/crypto";

const SUPPORT_CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SUPPORT_CODE_PATTERN = /^SUP-[0-9A-F]{10}$/;

export class SupportCodeCodec {
  async generate(correlationId: string, eventId: string): Promise<string> {
    const digest = await sha256Hex(`${correlationId}:${eventId}:support-code-v1`);
    return `SUP-${digest.slice(0, 10).toUpperCase()}`;
  }

  validate(supportCode: string): void {
    if (!SUPPORT_CODE_PATTERN.test(supportCode)) {
      throw new TypeError("Invalid Support Code");
    }
  }

  expiresAt(createdAt: number): number {
    return createdAt + SUPPORT_CODE_TTL_MS;
  }
}

export function runtimeSupportCode(correlationId: string): string {
  const safe = correlationId.replace(/[^0-9a-f]/gi, "").toUpperCase();
  return `SUP-${safe.slice(-10).padStart(10, "0")}`;
}
