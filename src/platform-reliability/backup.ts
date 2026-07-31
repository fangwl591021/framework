import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import type { AuditPort } from "../ports/audit-port";
import {
  type BackupRecord,
  type EnvironmentName,
  ReliabilityError,
  type ReliabilityOperationContext,
} from "./models";
import type { BackupCatalogPort, IdempotentOperationPort } from "./ports";

export interface BackupSnapshot {
  readonly content: Uint8Array;
  readonly databaseVersion: string;
  readonly recoveryPoint: number;
  readonly recordCount: number;
}

export interface BackupProviderPort {
  capture(): Promise<BackupSnapshot>;
}

export interface BackupStoragePort {
  readonly providerName: string;
  put(backupId: string, content: Uint8Array): Promise<string>;
  get(storageReference: string): Promise<Uint8Array | null>;
}

export interface RestoreProviderPort {
  restore(snapshot: BackupSnapshot): Promise<void>;
}

export interface BackupEncryptionResult {
  readonly content: Uint8Array;
  readonly encrypted: boolean;
}

export interface BackupEncryptionPort {
  encrypt(content: Uint8Array): Promise<BackupEncryptionResult>;
  decrypt(content: Uint8Array, encrypted: boolean): Promise<Uint8Array>;
}

export interface BackupNotification {
  readonly backupId: string;
  readonly status: "completed" | "failed";
  readonly reasonCode: string;
}

export interface BackupNotificationPort {
  notify(notification: BackupNotification): Promise<void>;
}

export interface CreateBackupInput {
  readonly sourceEnvironment: EnvironmentName;
  readonly releaseId: string;
  readonly retentionUntil: number;
}

export class LocalTestEncryptionAdapter implements BackupEncryptionPort {
  async encrypt(content: Uint8Array): Promise<BackupEncryptionResult> {
    return { content: content.slice(), encrypted: false };
  }

  async decrypt(content: Uint8Array, encrypted: boolean): Promise<Uint8Array> {
    if (encrypted) throw new ReliabilityError("BACKUP_CORRUPTED");
    return content.slice();
  }
}

export class NoopBackupNotificationAdapter implements BackupNotificationPort {
  async notify(_notification: BackupNotification): Promise<void> {}
}

export class BackupService {
  constructor(
    private readonly provider: BackupProviderPort,
    private readonly storage: BackupStoragePort,
    private readonly restoreProvider: RestoreProviderPort,
    private readonly encryption: BackupEncryptionPort,
    private readonly notification: BackupNotificationPort,
    private readonly catalog: BackupCatalogPort,
    private readonly idempotency: IdempotentOperationPort,
    private readonly audit: AuditPort,
    private readonly clock: Clock,
    private readonly uuidv7: UuidV7,
  ) {}

  async create(
    input: CreateBackupInput,
    context: ReliabilityOperationContext,
  ): Promise<BackupRecord> {
    return this.idempotency.execute("backup.create", context, async () => {
      const backupId = this.uuidv7.generate();
      try {
        const snapshot = await this.provider.capture();
        const encrypted = await this.encryption.encrypt(snapshot.content);
        const checksum = await sha256Hex(encrypted.content);
        const storageReference = await this.storage.put(
          backupId,
          encrypted.content,
        );
        const record: BackupRecord = Object.freeze({
          backupId,
          sourceEnvironment: input.sourceEnvironment,
          databaseVersion: snapshot.databaseVersion,
          releaseId: input.releaseId,
          checksum,
          encrypted: encrypted.encrypted,
          storageProvider: this.storage.providerName,
          storageReference,
          status: "completed",
          createdAt: this.clock.now().getTime(),
          recoveryPoint: snapshot.recoveryPoint,
          retentionUntil: input.retentionUntil,
          restoreVerifiedAt: null,
        });
        await this.catalog.save(record);
        await this.audit.record({
          action: "backup.creation",
          resourceType: "backup",
          resourceId: backupId,
          correlationId: context.correlationId,
        });
        await this.notification.notify({
          backupId,
          status: "completed",
          reasonCode: "BACKUP_COMPLETED",
        });
        return record;
      } catch (error) {
        await this.audit.record({
          action: "backup.failure",
          resourceType: "backup",
          resourceId: backupId,
          correlationId: context.correlationId,
        });
        await this.notification.notify({
          backupId,
          status: "failed",
          reasonCode: "BACKUP_FAILED",
        });
        throw error;
      }
    });
  }

  async restore(
    backupId: string,
    context: ReliabilityOperationContext,
  ): Promise<BackupRecord> {
    return this.idempotency.execute("backup.restore", context, async () => {
      await this.audit.record({
        action: "restore.request",
        resourceType: "backup",
        resourceId: backupId,
        correlationId: context.correlationId,
      });
      try {
        const record = await this.catalog.getBackup(backupId);
        if (!record || record.status !== "completed") {
          throw new ReliabilityError("BACKUP_NOT_FOUND");
        }
        const stored = await this.storage.get(record.storageReference);
        if (!stored || await sha256Hex(stored) !== record.checksum) {
          throw new ReliabilityError("BACKUP_CORRUPTED");
        }
        const content = await this.encryption.decrypt(stored, record.encrypted);
        const snapshot = parseSnapshot(content);
        if (snapshot.databaseVersion !== record.databaseVersion) {
          throw new ReliabilityError("BACKUP_CORRUPTED");
        }
        await this.restoreProvider.restore(snapshot);
        const verified: BackupRecord = Object.freeze({
          ...record,
          restoreVerifiedAt: this.clock.now().getTime(),
        });
        await this.catalog.save(verified);
        await this.audit.record({
          action: "restore.completion",
          resourceType: "backup",
          resourceId: backupId,
          correlationId: context.correlationId,
        });
        return verified;
      } catch (error) {
        await this.audit.record({
          action: "restore.failure",
          resourceType: "backup",
          resourceId: backupId,
          correlationId: context.correlationId,
        });
        throw error;
      }
    });
  }
}

export function encodeSnapshot(
  databaseVersion: string,
  recoveryPoint: number,
  recordCount: number,
  data: unknown,
): BackupSnapshot {
  const content = new TextEncoder().encode(JSON.stringify({
    databaseVersion,
    recoveryPoint,
    recordCount,
    data,
  }));
  return Object.freeze({
    content,
    databaseVersion,
    recoveryPoint,
    recordCount,
  });
}

export function parseSnapshot(content: Uint8Array): BackupSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(content));
  } catch {
    throw new ReliabilityError("BACKUP_CORRUPTED");
  }
  if (
    !value
    || typeof value !== "object"
    || !("databaseVersion" in value)
    || typeof value.databaseVersion !== "string"
    || !("recoveryPoint" in value)
    || typeof value.recoveryPoint !== "number"
    || !("recordCount" in value)
    || typeof value.recordCount !== "number"
    || !("data" in value)
  ) {
    throw new ReliabilityError("BACKUP_CORRUPTED");
  }
  return Object.freeze({
    content: content.slice(),
    databaseVersion: value.databaseVersion,
    recoveryPoint: value.recoveryPoint,
    recordCount: value.recordCount,
  });
}

export async function sha256Hex(content: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", content);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

abstract class DisabledStorageAdapter implements BackupStoragePort {
  abstract readonly providerName: string;

  async put(_backupId: string, _content: Uint8Array): Promise<string> {
    throw new ReliabilityError("PROVIDER_DISABLED");
  }

  async get(_storageReference: string): Promise<Uint8Array | null> {
    throw new ReliabilityError("PROVIDER_DISABLED");
  }
}

export class DisabledR2Adapter extends DisabledStorageAdapter {
  readonly providerName = "r2-disabled";
}

export class DisabledGoogleDriveAdapter extends DisabledStorageAdapter {
  readonly providerName = "google-drive-disabled";
}

export class DisabledExternalObjectStorageAdapter extends DisabledStorageAdapter {
  readonly providerName = "external-object-storage-disabled";
}
