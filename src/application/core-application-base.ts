import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import {
  digestIdentitySubject,
  type IdentityDigestKeyProvider,
  requestFingerprint,
  sha256Hex,
} from "../persistence/crypto";
import {
  DomainConflictError,
  DomainNotFoundError,
  TenantBoundaryError,
  type IdentityMapping,
  type PlatformUser,
  type Role,
  type RoleAssignment,
  type Tenant,
  type TenantMembership,
} from "../persistence/models";
import {
  createD1Repositories,
  type CoreRepositories,
} from "../persistence/repositories";

export interface MutationContext {
  readonly idempotencyKey: string;
  readonly actorType: "platform_user" | "service";
  readonly actorReference: string;
  readonly correlationId: string;
}

interface IdempotencyScope {
  readonly scopeType: "platform" | "tenant";
  readonly tenantId: string | null;
}

interface AuditInput {
  readonly action: string;
  readonly resourceType: string;
  readonly resourceReference: string;
  readonly reasonCode: string;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const PROCESSING_LEASE_MS = 30_000;

function nowMs(clock: Clock): number {
  return clock.now().getTime();
}

export function assertSafeText(name: string, value: string, max: number): void {
  if (!value.trim() || value.length > max) {
    throw new TypeError(`${name} is invalid`);
  }
}

export function translateConstraint(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("last_tenant_owner") || message.includes("LAST_TENANT_OWNER")) {
    throw new DomainConflictError("LAST_TENANT_OWNER");
  }
  if (
    message.includes("UNIQUE constraint failed") ||
    message.includes("constraint failed")
  ) {
    throw new DomainConflictError("DUPLICATE_ACTIVE_RECORD");
  }
  throw error;
}

export class CoreApplicationBase {
  readonly repositories: CoreRepositories;

  constructor(
    protected readonly db: D1Database,
    protected readonly clock: Clock,
    protected readonly uuidv7: UuidV7,
    protected readonly identityKeys: IdentityDigestKeyProvider,
  ) {
    this.repositories = createD1Repositories(db);
  }

  private auditStatement(
    scope: IdempotencyScope,
    context: MutationContext,
    audit: AuditInput,
    timestamp: number,
    decision: "changed" | "denied" = "changed",
  ): D1PreparedStatement {
    return this.db
      .prepare(
        `INSERT INTO audit_records (
          id, scope_type, tenant_id, actor_type, actor_reference, action,
          resource_type, resource_reference, decision, reason_code,
          correlation_reference, occurred_at, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)`,
      )
      .bind(
        this.uuidv7.generate(),
        scope.scopeType,
        scope.tenantId,
        context.actorType,
        context.actorReference,
        audit.action,
        audit.resourceType,
        audit.resourceReference,
        decision,
        audit.reasonCode,
        context.correlationId,
        timestamp,
      );
  }

  protected async executeIdempotent<T>(
    scope: IdempotencyScope,
    operation: string,
    fingerprintInput: unknown,
    context: MutationContext,
    build: (timestamp: number) => {
      readonly result: T;
      readonly statements: readonly D1PreparedStatement[];
      readonly audit: AuditInput;
    },
  ): Promise<T> {
    assertSafeText("idempotencyKey", context.idempotencyKey, 200);
    assertSafeText("correlationId", context.correlationId, 255);
    const keyHash = await sha256Hex(context.idempotencyKey);
    const fingerprint = await requestFingerprint(fingerprintInput);
    const existing =
      scope.scopeType === "platform"
        ? await this.repositories.idempotency.findPlatform(operation, keyHash)
        : await this.repositories.idempotency.findTenant(
            scope.tenantId as string,
            operation,
            keyHash,
          );

    if (existing) {
      if (existing.requestFingerprint !== fingerprint) {
        throw new DomainConflictError("IDEMPOTENCY_CONFLICT");
      }
      if (existing.status === "completed") {
        return JSON.parse(existing.storedResultJson as string) as T;
      }
      if (existing.status === "failed") {
        const failed = JSON.parse(existing.storedResultJson as string) as { code?: string };
        if (failed.code === "LAST_TENANT_OWNER") {
          throw new DomainConflictError("LAST_TENANT_OWNER");
        }
        throw new DomainConflictError("LIFECYCLE_CONFLICT");
      }
      if ((existing.leaseExpiresAt as number) > nowMs(this.clock)) {
        throw new DomainConflictError("IDEMPOTENCY_IN_PROGRESS");
      }
      await this.recoverStaleIdempotency(existing.id, existing.generation);
    }

    const timestamp = nowMs(this.clock);
    const recordId = existing?.id ?? this.uuidv7.generate();
    const generation = (existing?.generation ?? 0) + 1;
    const owner = this.uuidv7.generate();
    const built = build(timestamp);
    const storedResult = JSON.stringify(built.result);
    if (storedResult.length > 4096) {
      throw new TypeError("Stored result exceeds 4096 bytes");
    }

    const claim = existing
      ? this.db
          .prepare(
            `UPDATE idempotency_records
             SET status = 'processing', stored_result_json = NULL,
                 result_code = NULL, processing_owner = ?1,
                 generation = ?2, lease_expires_at = ?3,
                 completed_at = NULL, started_at = ?4, updated_at = ?4
             WHERE id = ?5 AND generation = ?6 AND status = 'failed'`,
          )
          .bind(
            owner,
            generation,
            timestamp + PROCESSING_LEASE_MS,
            timestamp,
            recordId,
            existing.generation,
          )
      : this.db
          .prepare(
            `INSERT INTO idempotency_records (
              id, scope_type, tenant_id, operation, idempotency_key_hash,
              request_fingerprint, status, stored_result_json, result_code,
              processing_owner, generation, lease_expires_at, started_at,
              completed_at, expires_at, created_at, updated_at
            ) VALUES (
              ?1, ?2, ?3, ?4, ?5, ?6, 'processing', NULL, NULL,
              ?7, ?8, ?9, ?10, NULL, ?11, ?10, ?10
            )`,
          )
          .bind(
            recordId,
            scope.scopeType,
            scope.tenantId,
            operation,
            keyHash,
            fingerprint,
            owner,
            generation,
            timestamp + PROCESSING_LEASE_MS,
            timestamp,
            timestamp + IDEMPOTENCY_TTL_MS,
          );

    const complete = this.db
      .prepare(
        `UPDATE idempotency_records
         SET status = 'completed', stored_result_json = ?1,
             result_code = 'COMPLETED', processing_owner = NULL,
             lease_expires_at = NULL, completed_at = ?2, updated_at = ?2
         WHERE id = ?3 AND generation = ?4 AND processing_owner = ?5
           AND status = 'processing'`,
      )
      .bind(storedResult, timestamp, recordId, generation, owner);

    try {
      await this.db.batch([
        claim,
        ...built.statements,
        this.auditStatement(scope, context, built.audit, timestamp),
        complete,
      ]);
      return built.result;
    } catch (error) {
      const winner =
        scope.scopeType === "platform"
          ? await this.repositories.idempotency.findPlatform(operation, keyHash)
          : await this.repositories.idempotency.findTenant(
              scope.tenantId as string,
              operation,
              keyHash,
            );
      if (
        winner?.requestFingerprint === fingerprint &&
        winner.status === "completed"
      ) {
        return JSON.parse(winner.storedResultJson as string) as T;
      }
      translateConstraint(error);
    }
  }

  private async recoverStaleIdempotency(
    id: string,
    generation: number,
  ): Promise<void> {
    const timestamp = nowMs(this.clock);
    const storedResult = JSON.stringify({
      code: "STALE_PROCESSING_RECOVERED",
      retryable: true,
    });
    const result = await this.db
      .prepare(
        `UPDATE idempotency_records
         SET status = 'failed', stored_result_json = ?1,
             result_code = 'STALE_PROCESSING_RECOVERED',
             processing_owner = NULL, lease_expires_at = NULL,
             completed_at = ?2, updated_at = ?2
         WHERE id = ?3 AND generation = ?4 AND status = 'processing'
           AND lease_expires_at <= ?2`,
      )
      .bind(storedResult, timestamp, id, generation)
      .run();
    if (result.meta.changes !== 1) {
      throw new DomainConflictError("IDEMPOTENCY_IN_PROGRESS");
    }
  }

  protected async recordDenied(
    scope: IdempotencyScope,
    operation: string,
    fingerprintInput: unknown,
    context: MutationContext,
    audit: AuditInput,
    code: "LAST_TENANT_OWNER",
  ): Promise<void> {
    const timestamp = nowMs(this.clock);
    const keyHash = await sha256Hex(context.idempotencyKey);
    const fingerprint = await requestFingerprint(fingerprintInput);
    const existing =
      scope.scopeType === "platform"
        ? await this.repositories.idempotency.findPlatform(operation, keyHash)
        : await this.repositories.idempotency.findTenant(
            scope.tenantId as string,
            operation,
            keyHash,
          );
    if (existing) {
      if (existing.requestFingerprint !== fingerprint) {
        throw new DomainConflictError("IDEMPOTENCY_CONFLICT");
      }
      return;
    }
    const storedResult = JSON.stringify({ code, retryable: false });
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO idempotency_records (
            id, scope_type, tenant_id, operation, idempotency_key_hash,
            request_fingerprint, status, stored_result_json, result_code,
            processing_owner, generation, lease_expires_at, started_at,
            completed_at, expires_at, created_at, updated_at
          ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, 'failed', ?7, ?8,
            NULL, 1, NULL, ?9, ?9, ?10, ?9, ?9
          )`,
        )
        .bind(
          this.uuidv7.generate(),
          scope.scopeType,
          scope.tenantId,
          operation,
          keyHash,
          fingerprint,
          storedResult,
          code,
          timestamp,
          timestamp + IDEMPOTENCY_TTL_MS,
        ),
      this.auditStatement(scope, context, audit, timestamp, "denied"),
    ]);
  }
}
