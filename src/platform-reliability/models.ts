export type EnvironmentName = "development" | "staging" | "production";

export type ReleaseStatus =
  | "prepared"
  | "validating"
  | "approved"
  | "deploying"
  | "healthy"
  | "failed"
  | "rolled_back";

export type BackupStatus =
  | "pending"
  | "creating"
  | "completed"
  | "failed"
  | "expired"
  | "deleted";

export interface EnvironmentConfig {
  readonly environment: EnvironmentName;
  readonly d1DatabaseReference: string;
  readonly secretProviderReference: string;
  readonly releaseChannel: string;
}

export interface EnvironmentManifest {
  readonly version: 1;
  readonly environments: readonly EnvironmentConfig[];
}

export interface TrustedDeploymentContext {
  readonly source: "deployment_configuration";
  readonly target: EnvironmentName;
}

export interface ReleaseRecord {
  readonly releaseId: string;
  readonly gitCommitSha: string;
  readonly applicationVersion: string;
  readonly migrationVersion: string;
  readonly buildArtifactDigest: string;
  readonly environment: EnvironmentName;
  readonly releaseStatus: ReleaseStatus;
  readonly previousStableReleaseId: string | null;
  readonly createdAt: number;
  readonly promotedAt: number | null;
  readonly rolledBackAt: number | null;
}

export interface ReleasePreparation {
  readonly gitCommitSha: string;
  readonly applicationVersion: string;
  readonly migrationVersion: string;
  readonly buildArtifactDigest: string;
  readonly environment: EnvironmentName;
  readonly workingTreeClean: boolean;
  readonly commitKnown: boolean;
}

export interface ReleaseRollbackRecord {
  readonly rollbackId: string;
  readonly releaseId: string;
  readonly targetReleaseId: string | null;
  readonly decision: RestoreDecision;
  readonly status: "requested" | "completed" | "failed";
  readonly requestedAt: number;
  readonly completedAt: number | null;
}

export interface BackupRecord {
  readonly backupId: string;
  readonly sourceEnvironment: EnvironmentName;
  readonly databaseVersion: string;
  readonly releaseId: string;
  readonly checksum: string;
  readonly encrypted: boolean;
  readonly storageProvider: string;
  readonly storageReference: string;
  readonly status: BackupStatus;
  readonly createdAt: number;
  readonly recoveryPoint: number;
  readonly retentionUntil: number;
  readonly restoreVerifiedAt: number | null;
}

export type RestoreDecision =
  | "code_rollback"
  | "forward_fix"
  | "restore_required"
  | "not_eligible";

export interface MigrationCompatibilityCheck {
  readonly backwardCompatible: boolean;
  readonly currentMigrationVersion: string;
  readonly targetMigrationVersion: string;
  readonly destructiveDownMigrationRequired: boolean;
}

export interface RollbackPlan {
  readonly eligible: boolean;
  readonly decision: RestoreDecision;
  readonly targetReleaseId: string | null;
  readonly backupEvidenceRequired: boolean;
  readonly dataLossRisk: boolean;
  readonly reasonCode: string;
}

export interface ReliabilityOperationContext {
  readonly idempotencyKey: string;
  readonly fingerprint: string;
  readonly correlationId: string;
}

export type ReliabilityErrorCode =
  | "INVALID_ENVIRONMENT_CONFIGURATION"
  | "ENVIRONMENT_BOUNDARY_VIOLATION"
  | "INVALID_RELEASE_MANIFEST"
  | "INVALID_RELEASE_TRANSITION"
  | "RELEASE_GATE_REJECTED"
  | "ROLLBACK_NOT_ELIGIBLE"
  | "BACKUP_NOT_FOUND"
  | "BACKUP_CORRUPTED"
  | "BACKUP_NOT_VERIFIED"
  | "INVALID_BACKUP_STORAGE_CONFIGURATION"
  | "PROVIDER_DISABLED"
  | "IDEMPOTENCY_CONFLICT"
  | "RESTORE_INTEGRITY_FAILED";

export class ReliabilityError extends Error {
  constructor(readonly code: ReliabilityErrorCode) {
    super(code);
    this.name = "ReliabilityError";
  }
}
