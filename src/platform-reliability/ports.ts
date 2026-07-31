import type { AuditPort } from "../ports/audit-port";
import type {
  BackupRecord,
  ReleaseRecord,
  ReleaseRollbackRecord,
  ReliabilityOperationContext,
} from "./models";

export interface IdempotentOperationPort {
  execute<T>(
    operation: string,
    context: ReliabilityOperationContext,
    work: () => Promise<T>,
  ): Promise<T>;
}

export interface ReleaseRepositoryPort {
  save(record: ReleaseRecord): Promise<void>;
  getRelease(releaseId: string): Promise<ReleaseRecord | null>;
  findHealthy(environment: ReleaseRecord["environment"]): Promise<ReleaseRecord | null>;
}

export interface RollbackRepositoryPort {
  save(record: ReleaseRollbackRecord): Promise<void>;
  getRollback(rollbackId: string): Promise<ReleaseRollbackRecord | null>;
}

export interface BackupCatalogPort {
  save(record: BackupRecord): Promise<void>;
  getBackup(backupId: string): Promise<BackupRecord | null>;
}

export interface ReliabilityPorts {
  readonly audit: AuditPort;
  readonly idempotency: IdempotentOperationPort;
  readonly releases: ReleaseRepositoryPort;
  readonly rollbacks: RollbackRepositoryPort;
  readonly backups: BackupCatalogPort;
}
