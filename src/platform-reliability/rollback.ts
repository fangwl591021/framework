import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import type { AuditPort } from "../ports/audit-port";
import {
  type BackupRecord,
  type MigrationCompatibilityCheck,
  type ReleaseRecord,
  type ReleaseRollbackRecord,
  type ReliabilityOperationContext,
  ReliabilityError,
  type RollbackPlan,
} from "./models";
import type {
  IdempotentOperationPort,
  ReleaseRepositoryPort,
  RollbackRepositoryPort,
} from "./ports";

export class RollbackEligibilityCheck {
  evaluate(
    current: ReleaseRecord,
    target: ReleaseRecord | null,
    compatibility: MigrationCompatibilityCheck,
    backup: BackupRecord | null,
  ): RollbackPlan {
    if (
      current.releaseStatus !== "healthy"
      || !target
      || target.releaseStatus !== "healthy"
      || current.previousStableReleaseId !== target.releaseId
    ) {
      return this.reject("PREVIOUS_STABLE_RELEASE_MISSING");
    }
    if (compatibility.destructiveDownMigrationRequired) {
      return Object.freeze({
        eligible: false,
        decision: "forward_fix",
        targetReleaseId: target.releaseId,
        backupEvidenceRequired: true,
        dataLossRisk: true,
        reasonCode: "DESTRUCTIVE_DOWN_MIGRATION_FORBIDDEN",
      });
    }
    if (compatibility.backwardCompatible) {
      return Object.freeze({
        eligible: true,
        decision: "code_rollback",
        targetReleaseId: target.releaseId,
        backupEvidenceRequired: false,
        dataLossRisk: false,
        reasonCode: "SCHEMA_BACKWARD_COMPATIBLE",
      });
    }
    const verifiedBackup = backup?.status === "completed"
      && backup.restoreVerifiedAt !== null
      && backup.releaseId === current.releaseId;
    return Object.freeze({
      eligible: verifiedBackup,
      decision: verifiedBackup ? "restore_required" : "forward_fix",
      targetReleaseId: target.releaseId,
      backupEvidenceRequired: true,
      dataLossRisk: true,
      reasonCode: verifiedBackup
        ? "VERIFIED_RESTORE_REQUIRED"
        : "BACKUP_EVIDENCE_MISSING",
    });
  }

  private reject(reasonCode: string): RollbackPlan {
    return Object.freeze({
      eligible: false,
      decision: "not_eligible",
      targetReleaseId: null,
      backupEvidenceRequired: false,
      dataLossRisk: false,
      reasonCode,
    });
  }
}

export class RollbackPlanner {
  constructor(
    private readonly releases: ReleaseRepositoryPort,
    private readonly rollbacks: RollbackRepositoryPort,
    private readonly idempotency: IdempotentOperationPort,
    private readonly audit: AuditPort,
    private readonly clock: Clock,
    private readonly uuidv7: UuidV7,
    private readonly eligibility = new RollbackEligibilityCheck(),
  ) {}

  async request(
    releaseId: string,
    compatibility: MigrationCompatibilityCheck,
    backup: BackupRecord | null,
    context: ReliabilityOperationContext,
  ): Promise<ReleaseRollbackRecord> {
    return this.idempotency.execute("rollback.request", context, async () => {
      const current = await this.releases.getRelease(releaseId);
      if (!current) throw new ReliabilityError("ROLLBACK_NOT_ELIGIBLE");
      const target = current.previousStableReleaseId
        ? await this.releases.getRelease(current.previousStableReleaseId)
        : null;
      const plan = this.eligibility.evaluate(current, target, compatibility, backup);
      if (!plan.eligible) throw new ReliabilityError("ROLLBACK_NOT_ELIGIBLE");
      const record: ReleaseRollbackRecord = Object.freeze({
        rollbackId: this.uuidv7.generate(),
        releaseId,
        targetReleaseId: plan.targetReleaseId,
        decision: plan.decision,
        status: "requested",
        requestedAt: this.clock.now().getTime(),
        completedAt: null,
      });
      await this.rollbacks.save(record);
      await this.audit.record({
        action: "rollback.request",
        resourceType: "release_rollback",
        resourceId: record.rollbackId,
        correlationId: context.correlationId,
      });
      return record;
    });
  }

  async complete(
    rollbackId: string,
    context: ReliabilityOperationContext,
  ): Promise<ReleaseRollbackRecord> {
    const record = await this.rollbacks.getRollback(rollbackId);
    if (!record || record.status !== "requested") {
      throw new ReliabilityError("ROLLBACK_NOT_ELIGIBLE");
    }
    const completed: ReleaseRollbackRecord = Object.freeze({
      ...record,
      status: "completed",
      completedAt: this.clock.now().getTime(),
    });
    await this.rollbacks.save(completed);
    await this.audit.record({
      action: "rollback.completion",
      resourceType: "release_rollback",
      resourceId: rollbackId,
      correlationId: context.correlationId,
    });
    return completed;
  }
}
