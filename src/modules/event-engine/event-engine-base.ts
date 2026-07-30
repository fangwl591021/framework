import type { Clock } from "../../core/clock";
import type { UuidV7 } from "../../core/uuidv7";
import { PlatformCoreApplication } from "../../application/core-services";
import { assertSafeText } from "../../application/core-application-base";
import type { IdentityDigestKeyProvider } from "../../persistence/crypto";
import { requestFingerprint, sha256Hex } from "../../persistence/crypto";
import {
  DomainConflictError,
  DomainNotFoundError,
  TenantBoundaryError,
} from "../../persistence/models";
import { eventPermissionPolicy } from "./contract";
import {
  EventEngineError,
  type EventFormField,
  type RegistrationAnswerInput,
} from "./models";
import type { EventQrTokenPort } from "./ports";
import { EventEngineRepository } from "./repository";

export interface ValidatedAnswer {
  readonly field: EventFormField;
  readonly valueJson: string;
}

export class EventEngineBase extends PlatformCoreApplication {
  readonly eventRepository: EventEngineRepository;

  constructor(
    db: D1Database,
    clock: Clock,
    uuidv7: UuidV7,
    identityKeys: IdentityDigestKeyProvider,
    protected readonly qrTokens: EventQrTokenPort,
  ) {
    super(db, clock, uuidv7, identityKeys);
    this.eventRepository = new EventEngineRepository(db);
  }

  protected async requireEventPermission(
    tenantId: string,
    membershipId: string,
    permission: keyof typeof eventPermissionPolicy,
  ): Promise<void> {
    const tenant = await this.repositories.tenants.getById(tenantId);
    if (!tenant) throw new TenantBoundaryError();
    if (tenant.status !== "active") {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    const allowed = await this.checkPermission(
      tenantId,
      membershipId,
      eventPermissionPolicy[permission],
    );
    if (!allowed) throw new EventEngineError("EVENT_PERMISSION_DENIED");
  }

  protected async replayEventResult<T>(
    tenantId: string,
    operation: string,
    fingerprintInput: unknown,
    context: { readonly idempotencyKey: string },
  ): Promise<{ readonly found: false } | { readonly found: true; readonly result: T }> {
    const keyHash = await sha256Hex(context.idempotencyKey);
    const fingerprint = await requestFingerprint(fingerprintInput);
    const existing = await this.repositories.idempotency.findTenant(
      tenantId,
      operation,
      keyHash,
    );
    if (!existing) return { found: false };
    if (existing.requestFingerprint !== fingerprint) {
      throw new DomainConflictError("IDEMPOTENCY_CONFLICT");
    }
    if (existing.status === "completed" && existing.storedResultJson) {
      return {
        found: true,
        result: JSON.parse(existing.storedResultJson) as T,
      };
    }
    return { found: false };
  }
  protected async requireActivePlatformUser(platformUserId: string): Promise<void> {
    const user = await this.repositories.platformUsers.getById(platformUserId);
    if (!user) throw new DomainNotFoundError("platform_user");
    if (user.status !== "active") {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
  }

  protected validateText(name: string, value: string, max: number): void {
    assertSafeText(name, value, max);
  }

  protected async validateAnswers(
    tenantId: string,
    eventId: string,
    answers: readonly RegistrationAnswerInput[],
  ): Promise<readonly ValidatedAnswer[]> {
    const fields = await this.eventRepository.listFields(tenantId, eventId);
    const byId = new Map(fields.map((field) => [field.id, field]));
    const supplied = new Map<string, unknown>();
    for (const answer of answers) {
      if (supplied.has(answer.fieldId) || !byId.has(answer.fieldId)) {
        throw new EventEngineError("EVENT_INVALID_ANSWERS");
      }
      supplied.set(answer.fieldId, answer.value);
    }
    if (fields.some((field) => field.required && !supplied.has(field.id))) {
      throw new EventEngineError("EVENT_INVALID_ANSWERS");
    }
    const validated: ValidatedAnswer[] = [];
    for (const [fieldId, value] of supplied) {
      const field = byId.get(fieldId);
      if (!field) throw new EventEngineError("EVENT_INVALID_ANSWERS");
      if (field.fieldType === "text") {
        if (
          typeof value !== "string"
          || value.length > 1000
          || (field.required && !value.trim())
        ) {
          throw new EventEngineError("EVENT_INVALID_ANSWERS");
        }
      } else if (field.fieldType === "number") {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new EventEngineError("EVENT_INVALID_ANSWERS");
        }
      } else if (field.fieldType === "checkbox") {
        if (typeof value !== "boolean") {
          throw new EventEngineError("EVENT_INVALID_ANSWERS");
        }
      } else if (
        typeof value !== "string"
        || !field.options?.includes(value)
      ) {
        throw new EventEngineError("EVENT_INVALID_ANSWERS");
      }
      const valueJson = JSON.stringify(value);
      if (valueJson.length > 2048) {
        throw new EventEngineError("EVENT_INVALID_ANSWERS");
      }
      validated.push({ field, valueJson });
    }
    return validated;
  }

  protected currentTimestamp(): number {
    return this.clock.now().getTime();
  }
}
