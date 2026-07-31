import type { AuditIntent, AuditPort } from "../ports/audit-port";
import type {
  BackupOperationalEvidence,
  BackupOperationalEvidencePort,
} from "./backup";
import {
  type BackupRecord,
  type ReleaseRecord,
  type ReleaseRollbackRecord,
  ReliabilityError,
  type ReliabilityOperationContext,
} from "./models";
import type {
  BackupCatalogPort,
  IdempotentOperationPort,
  ReleaseRepositoryPort,
  RollbackRepositoryPort,
} from "./ports";

export class LocalBackupOperationalEvidenceAdapter
implements BackupOperationalEvidencePort {
  readonly records: BackupOperationalEvidence[] = [];

  async record(evidence: BackupOperationalEvidence): Promise<void> {
    this.records.push(Object.freeze({ ...evidence }));
  }
}

export class LocalAuditEvidenceAdapter implements AuditPort {
  readonly records: AuditIntent[] = [];

  async record(intent: AuditIntent): Promise<void> {
    this.records.push(Object.freeze({ ...intent }));
  }
}

export class LocalIdempotencyAdapter implements IdempotentOperationPort {
  private readonly records = new Map<
    string,
    { readonly fingerprint: string; readonly result: unknown }
  >();

  async execute<T>(
    operation: string,
    context: ReliabilityOperationContext,
    work: () => Promise<T>,
  ): Promise<T> {
    const key = `${operation}:${context.idempotencyKey}`;
    const existing = this.records.get(key);
    if (existing) {
      if (existing.fingerprint !== context.fingerprint) {
        throw new ReliabilityError("IDEMPOTENCY_CONFLICT");
      }
      return existing.result as T;
    }
    const result = await work();
    this.records.set(key, Object.freeze({
      fingerprint: context.fingerprint,
      result,
    }));
    return result;
  }
}

export class LocalReliabilityRepository
implements ReleaseRepositoryPort, RollbackRepositoryPort, BackupCatalogPort {
  private readonly releases = new Map<string, ReleaseRecord>();
  private readonly rollbacks = new Map<string, ReleaseRollbackRecord>();
  private readonly backups = new Map<string, BackupRecord>();

  async save(
    record: ReleaseRecord | ReleaseRollbackRecord | BackupRecord,
  ): Promise<void> {
    if ("releaseStatus" in record) this.releases.set(record.releaseId, record);
    else if ("rollbackId" in record) this.rollbacks.set(record.rollbackId, record);
    else this.backups.set(record.backupId, record);
  }


  async findHealthy(
    environment: ReleaseRecord["environment"],
  ): Promise<ReleaseRecord | null> {
    const candidates = [...this.releases.values()]
      .filter((record) =>
        record.environment === environment && record.releaseStatus === "healthy"
      )
      .sort((left, right) => right.createdAt - left.createdAt);
    return candidates[0] ?? null;
  }

  async getRelease(releaseId: string): Promise<ReleaseRecord | null> {
    return this.releases.get(releaseId) ?? null;
  }

  async getRollback(rollbackId: string): Promise<ReleaseRollbackRecord | null> {
    return this.rollbacks.get(rollbackId) ?? null;
  }

  async getBackup(backupId: string): Promise<BackupRecord | null> {
    return this.backups.get(backupId) ?? null;
  }
}
