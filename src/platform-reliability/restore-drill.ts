import type { Clock } from "../core/clock";
import type { AuditPort } from "../ports/audit-port";
import type { BackupRecord, ReliabilityOperationContext } from "./models";
import { ReliabilityError } from "./models";
import type { IdempotentOperationPort } from "./ports";
import type { BackupService } from "./backup";

export interface RestoreVerification {
  readonly tableCount: number;
  readonly migrationLedgerCount: number;
  readonly foreignKeyViolations: number;
  readonly tenantIsolationValid: boolean;
  readonly auditEvidencePresent: boolean;
  readonly criticalRecordCount: number;
  readonly integrityErrors: readonly string[];
}

export interface RestoreDrillTargetPort {
  initializeFresh(): Promise<void>;
  seedTestData(): Promise<void>;
  destroyTestData(): Promise<void>;
  verifyRestoredData(): Promise<RestoreVerification>;
}

export interface RestoreDrillReport {
  readonly backupId: string;
  readonly databaseVersion: string;
  readonly backupOpenable: boolean;
  readonly restoredRecordCount: number;
  readonly integrityErrorCount: number;
  readonly recoveryPoint: number;
  readonly recoveryTimeMs: number;
  readonly migrationLedgerCount: number;
  readonly tenantIsolationValid: boolean;
  readonly auditEvidencePresent: boolean;
  readonly checksumVerified: boolean;
}

export class RestoreDrillService {
  constructor(
    private readonly backups: BackupService,
    private readonly target: RestoreDrillTargetPort,
    private readonly idempotency: IdempotentOperationPort,
    private readonly audit: AuditPort,
    private readonly clock: Clock,
  ) {}

  async run(
    sourceEnvironment: BackupRecord["sourceEnvironment"],
    releaseId: string,
    retentionUntil: number,
    context: ReliabilityOperationContext,
  ): Promise<RestoreDrillReport> {
    return this.idempotency.execute("restore.drill", context, async () => {
      const startedAt = this.clock.now().getTime();
      try {
        await this.target.initializeFresh();
        await this.target.seedTestData();
        const backup = await this.backups.create(
          { sourceEnvironment, releaseId, retentionUntil },
          {
            ...context,
            idempotencyKey: `${context.idempotencyKey}:backup`,
          },
        );
        await this.target.destroyTestData();
        const restored = await this.backups.restore(backup.backupId, {
          ...context,
          idempotencyKey: `${context.idempotencyKey}:restore`,
        });
        const verification = await this.target.verifyRestoredData();
        if (
          verification.integrityErrors.length > 0
          || verification.foreignKeyViolations !== 0
          || !verification.tenantIsolationValid
          || !verification.auditEvidencePresent
          || verification.migrationLedgerCount < 1
        ) {
          throw new ReliabilityError("RESTORE_INTEGRITY_FAILED");
        }
        const report: RestoreDrillReport = Object.freeze({
          backupId: backup.backupId,
          databaseVersion: restored.databaseVersion,
          backupOpenable: true,
          restoredRecordCount: verification.criticalRecordCount,
          integrityErrorCount: verification.integrityErrors.length,
          recoveryPoint: backup.recoveryPoint,
          recoveryTimeMs: Math.max(0, this.clock.now().getTime() - startedAt),
          migrationLedgerCount: verification.migrationLedgerCount,
          tenantIsolationValid: verification.tenantIsolationValid,
          auditEvidencePresent: verification.auditEvidencePresent,
          checksumVerified: true,
        });
        await this.audit.record({
          action: "restore.drill.completion",
          resourceType: "restore_drill",
          resourceId: backup.backupId,
          correlationId: context.correlationId,
        });
        return report;
      } catch (error) {
        await this.audit.record({
          action: "restore.drill.failure",
          resourceType: "restore_drill",
          resourceId: releaseId,
          correlationId: context.correlationId,
        });
        throw error;
      }
    });
  }
}
