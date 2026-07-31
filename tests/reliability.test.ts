import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AuditPort } from "../src/ports/audit-port";
import {
  BackupService,
  type BackupSnapshot,
  type BackupStoragePort,
  defaultEnvironmentManifest,
  DeploymentGateEvaluator,
  DisabledExternalObjectStorageAdapter,
  DisabledGoogleDriveAdapter,
  DisabledR2Adapter,
  encodeSnapshot,
  EnvironmentGuard,
  EnvironmentConfigurationService,
  LocalAuditEvidenceAdapter,

  LocalIdempotencyAdapter,
  LocalReliabilityRepository,
  LocalTestEncryptionAdapter,
  NoopBackupNotificationAdapter,
  ReleaseHealthEvaluator,
  ReleaseManager,

  RestoreDrillService,
  RollbackEligibilityCheck,
  RollbackPlanner,
  type BackupProviderPort,
  type DeploymentGateEvidence,
  type MigrationCompatibilityCheck,
  type ReleaseRecord,
  type ReliabilityOperationContext,
  type RestoreDrillTargetPort,
  type RestoreProviderPort,
  type RestoreVerification,
} from "../src/platform-reliability";
import { LocalFilesystemTestAdapter } from "../src/platform-reliability/local-filesystem-test-adapter";
import { FixedClock, SequenceUuidV7 } from "./helpers";

const allGates: DeploymentGateEvidence = Object.freeze({
  build: true,
  test: true,
  migration: true,
  security: true,
  backup: true,
  stagingHealth: true,
  productionApproval: true,
  postDeploymentHealth: true,
  rollback: true,
});

let contextSequence = 0;
function context(fingerprint = "fingerprint"): ReliabilityOperationContext {
  contextSequence += 1;
  return {
    idempotencyKey: `reliability-${contextSequence}`,
    fingerprint,
    correlationId: `correlation-${contextSequence}`,
  };
}

function release(
  overrides: Partial<ReleaseRecord> = {},
): ReleaseRecord {
  return {
    releaseId: "release-current",
    gitCommitSha: "a".repeat(40),
    applicationVersion: "2.0.0",
    migrationVersion: "0003",
    buildArtifactDigest: "b".repeat(64),
    environment: "production",
    releaseStatus: "healthy",
    previousStableReleaseId: "release-previous",
    createdAt: 2,
    promotedAt: 2,
    rolledBackAt: null,
    ...overrides,
  };
}

class MemoryBackupAdapter
implements BackupProviderPort, BackupStoragePort, RestoreProviderPort {
  readonly providerName = "memory-test";
  readonly artifacts = new Map<string, Uint8Array>();
  sourceData: unknown = { tenants: ["tenant-a", "tenant-b"] };
  restoredData: unknown = null;

  async capture(): Promise<BackupSnapshot> {
    return encodeSnapshot("0003", 100, 2, this.sourceData);
  }

  async put(backupId: string, content: Uint8Array): Promise<string> {
    this.artifacts.set(backupId, content.slice());
    return `memory:${backupId}`;
  }

  async get(storageReference: string): Promise<Uint8Array | null> {
    const id = storageReference.replace(/^memory:/, "");
    return this.artifacts.get(id)?.slice() ?? null;
  }

  async restore(snapshot: BackupSnapshot): Promise<void> {
    const decoded = JSON.parse(new TextDecoder().decode(snapshot.content)) as {
      data: unknown;
    };
    this.restoredData = decoded.data;
  }
}

function backupHarness(audit: AuditPort = new LocalAuditEvidenceAdapter()) {
  const adapter = new MemoryBackupAdapter();
  const repository = new LocalReliabilityRepository();
  const idempotency = new LocalIdempotencyAdapter();
  const service = new BackupService(
    adapter,
    adapter,
    adapter,
    new LocalTestEncryptionAdapter(),
    new NoopBackupNotificationAdapter(),
    repository,
    idempotency,
    audit,
    new FixedClock(),
    new SequenceUuidV7(),
  );
  return { adapter, repository, idempotency, service };
}

describe("Environment separation and deployment gates", () => {
  it("uses three fail-closed configurations with isolated D1 and Secret references", () => {
    const guard = new EnvironmentGuard();
    guard.validateManifest(defaultEnvironmentManifest);
    const references = defaultEnvironmentManifest.environments;
    expect(new Set(references.map(({ d1DatabaseReference }) => d1DatabaseReference)).size)
      .toBe(3);
    expect(new Set(references.map(({ secretProviderReference }) => secretProviderReference)).size)
      .toBe(3);
    expect(guard.load(defaultEnvironmentManifest, {
      source: "deployment_configuration",
      target: "staging",
    }).environment).toBe("staging");
  });


  it("audits an idempotent trusted environment configuration change", async () => {
    const audit = new LocalAuditEvidenceAdapter();
    const service = new EnvironmentConfigurationService(
      new LocalIdempotencyAdapter(),
      audit,
    );
    const operation = context();
    const first = await service.apply(defaultEnvironmentManifest, {
      source: "deployment_configuration",
      target: "development",
    }, operation);
    const replay = await service.apply(defaultEnvironmentManifest, {
      source: "deployment_configuration",
      target: "development",
    }, operation);
    expect(replay).toEqual(first);
    expect(audit.records.filter(
      ({ action }) => action === "environment.configuration.change",
    )).toHaveLength(1);
  });
  it("rejects duplicated environment resources and skips", () => {
    const guard = new EnvironmentGuard();
    const development = defaultEnvironmentManifest.environments[0];
    const staging = defaultEnvironmentManifest.environments[1];
    const production = defaultEnvironmentManifest.environments[2];
    if (!development || !staging || !production) throw new Error("manifest missing");
    expect(() => guard.validateManifest({
      version: 1,
      environments: [
        development,
        { ...staging, d1DatabaseReference: development.d1DatabaseReference },
        production,
      ],
    })).toThrowError(
      expect.objectContaining({ code: "INVALID_ENVIRONMENT_CONFIGURATION" }),
    );
    expect(() => guard.assertPromotion("development", "production")).toThrowError(
      expect.objectContaining({ code: "ENVIRONMENT_BOUNDARY_VIOLATION" }),
    );
  });

  it("requires every Production deployment gate", () => {
    const evaluator = new DeploymentGateEvaluator();
    expect(evaluator.evaluate("production", allGates).accepted).toBe(true);
    expect(evaluator.evaluate("production", {
      ...allGates,
      backup: false,
      productionApproval: false,
    })).toMatchObject({
      accepted: false,
      failedGates: ["backup", "productionApproval"],
    });
  });
});

describe("Release and rollback management", () => {
  it("rejects dirty, unknown, latest, and untraceable release manifests", async () => {
    const manager = new ReleaseManager(
      new LocalReliabilityRepository(),
      new LocalIdempotencyAdapter(),
      new LocalAuditEvidenceAdapter(),
      new FixedClock(),
      new SequenceUuidV7(),
    );
    await expect(manager.prepare({
      gitCommitSha: "unknown",
      applicationVersion: "latest",
      migrationVersion: "0003",
      buildArtifactDigest: "bad",
      environment: "development",
      workingTreeClean: false,
      commitKnown: false,
    }, context())).rejects.toMatchObject({ code: "INVALID_RELEASE_MANIFEST" });
  });

  it("records an exact release and enforces the approved transition sequence", async () => {
    const repository = new LocalReliabilityRepository();
    const audit = new LocalAuditEvidenceAdapter();
    const manager = new ReleaseManager(
      repository,
      new LocalIdempotencyAdapter(),
      audit,
      new FixedClock(),
      new SequenceUuidV7(),
    );
    const prepared = await manager.prepare({
      gitCommitSha: "a".repeat(40),
      applicationVersion: "2.0.0-rc1",
      migrationVersion: "0003",
      buildArtifactDigest: "b".repeat(64),
      environment: "development",
      workingTreeClean: true,
      commitKnown: true,
    }, context());
    const validating = await manager.transition(prepared.releaseId, "validating", context());
    const approved = await manager.transition(validating.releaseId, "approved", context());
    const deploying = await manager.promote(approved.releaseId, "staging", allGates, context());
    expect(deploying).toMatchObject({
      gitCommitSha: "a".repeat(40),
      applicationVersion: "2.0.0-rc1",
      migrationVersion: "0003",
      environment: "staging",
      releaseStatus: "deploying",
      previousStableReleaseId: null,
    });
    expect(audit.records.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        "release.prepare",
        "release.approve",
        "release.promotion",
      ]),
    );
    await expect(
      manager.transition(deploying.releaseId, "approved", context()),
    ).rejects.toMatchObject({ code: "INVALID_RELEASE_TRANSITION" });
  });

  it("selects code rollback only for a verified previous stable compatible release", () => {
    const previous = release({
      releaseId: "release-previous",
      applicationVersion: "1.9.0",
      previousStableReleaseId: null,
      createdAt: 1,
    });
    const plan = new RollbackEligibilityCheck().evaluate(
      release(),
      previous,
      {
        backwardCompatible: true,
        currentMigrationVersion: "0003",
        targetMigrationVersion: "0003",
        destructiveDownMigrationRequired: false,
      },
      null,
    );
    expect(plan).toMatchObject({
      eligible: true,
      decision: "code_rollback",
      dataLossRisk: false,
    });
  });

  it("rejects schema-incompatible rollback without verified Backup evidence", () => {
    const plan = new RollbackEligibilityCheck().evaluate(
      release(),
      release({
        releaseId: "release-previous",
        previousStableReleaseId: null,
      }),
      {
        backwardCompatible: false,
        currentMigrationVersion: "0004",
        targetMigrationVersion: "0003",
        destructiveDownMigrationRequired: false,
      },
      null,
    );
    expect(plan).toMatchObject({
      eligible: false,
      decision: "forward_fix",
      backupEvidenceRequired: true,
      dataLossRisk: true,
    });
  });

  it("records idempotent rollback requests and audit evidence", async () => {
    const repository = new LocalReliabilityRepository();
    await repository.save(release({
      releaseId: "release-previous",
      previousStableReleaseId: null,
      createdAt: 1,
    }));
    await repository.save(release());
    const audit = new LocalAuditEvidenceAdapter();
    const planner = new RollbackPlanner(
      repository,
      repository,
      new LocalIdempotencyAdapter(),
      audit,
      new FixedClock(),
      new SequenceUuidV7(),
    );
    const compatibility: MigrationCompatibilityCheck = {
      backwardCompatible: true,
      currentMigrationVersion: "0003",
      targetMigrationVersion: "0003",
      destructiveDownMigrationRequired: false,
    };
    const operation = context();
    const first = await planner.request("release-current", compatibility, null, operation);
    const replay = await planner.request("release-current", compatibility, null, operation);
    expect(replay).toEqual(first);
    expect(audit.records.filter(({ action }) => action === "rollback.request")).toHaveLength(1);
  });
});

describe("Backup, restore, and safe health", () => {
  const temporaryRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryRoots.splice(0).map(
      (root) => rm(root, { recursive: true, force: true }),
    ));
  });

  it("creates a checksum-protected idempotent Backup", async () => {
    const audit = new LocalAuditEvidenceAdapter();
    const { adapter, service } = backupHarness(audit);
    const operation = context();
    const first = await service.create({
      sourceEnvironment: "development",
      releaseId: "release-local",
      retentionUntil: Date.parse("2026-08-31T00:00:00Z"),
    }, operation);
    const replay = await service.create({
      sourceEnvironment: "development",
      releaseId: "release-local",
      retentionUntil: Date.parse("2026-08-31T00:00:00Z"),
    }, operation);
    expect(replay).toEqual(first);
    expect(first.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(adapter.artifacts).toHaveLength(1);
    expect(audit.records.filter(({ action }) => action === "backup.creation")).toHaveLength(1);
  });

  it("rejects missing and corrupted Backup artifacts", async () => {
    const { adapter, service } = backupHarness();
    await expect(service.restore("missing", context())).rejects.toMatchObject({
      code: "BACKUP_NOT_FOUND",
    });
    const backup = await service.create({
      sourceEnvironment: "development",
      releaseId: "release-local",
      retentionUntil: Date.parse("2026-08-31T00:00:00Z"),
    }, context());
    adapter.artifacts.set(
      backup.backupId,
      new TextEncoder().encode("corrupted"),
    );
    await expect(service.restore(backup.backupId, context())).rejects.toMatchObject({
      code: "BACKUP_CORRUPTED",
    });
  });

  it("writes and reads Local Filesystem test artifacts without exposing an absolute reference", async () => {
    const root = await mkdtemp(join(tmpdir(), "platform-backup-"));
    temporaryRoots.push(root);
    const adapter = new LocalFilesystemTestAdapter(root);
    const reference = await adapter.put(
      "backup-00000001",
      new TextEncoder().encode("artifact"),
    );
    expect(reference).toBe("local-file:backup-00000001.backup");
    expect(new TextDecoder().decode(await adapter.get(reference) ?? new Uint8Array()))
      .toBe("artifact");
    expect(reference).not.toContain(root);
  });

  it("keeps R2, Google Drive, and external storage disabled", async () => {
    for (const adapter of [
      new DisabledR2Adapter(),
      new DisabledGoogleDriveAdapter(),
      new DisabledExternalObjectStorageAdapter(),
    ]) {
      await expect(adapter.put("backup-disabled", new Uint8Array()))
        .rejects.toMatchObject({ code: "PROVIDER_DISABLED" });
    }
  });

  it("runs an idempotent Local Restore Drill and produces bounded evidence", async () => {
    const audit = new LocalAuditEvidenceAdapter();
    const harness = backupHarness(audit);
    const target: RestoreDrillTargetPort = {
      async initializeFresh() {},
      async seedTestData() {},
      async destroyTestData() {
        harness.adapter.restoredData = null;
      },
      async verifyRestoredData(): Promise<RestoreVerification> {
        return {
          tableCount: 30,
          migrationLedgerCount: 3,
          foreignKeyViolations: 0,
          tenantIsolationValid: true,
          auditEvidencePresent: true,
          criticalRecordCount: 2,
          integrityErrors: [],
        };
      },
    };
    const drill = new RestoreDrillService(
      harness.service,
      target,
      harness.idempotency,
      audit,
      new FixedClock(),
    );
    const operation = context();
    const first = await drill.run(
      "development",
      "release-local",
      Date.parse("2026-08-31T00:00:00Z"),
      operation,
    );
    const replay = await drill.run(
      "development",
      "release-local",
      Date.parse("2026-08-31T00:00:00Z"),
      operation,
    );
    expect(replay).toEqual(first);
    expect(first).toMatchObject({
      backupOpenable: true,
      restoredRecordCount: 2,
      integrityErrorCount: 0,
      migrationLedgerCount: 3,
      tenantIsolationValid: true,
      checksumVerified: true,
      recoveryPoint: 100,
    });
    expect(audit.records.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        "backup.creation",
        "restore.request",
        "restore.completion",
        "restore.drill.completion",
      ]),
    );
  });

  it("audits a Restore Drill integrity failure", async () => {
    const audit = new LocalAuditEvidenceAdapter();
    const harness = backupHarness(audit);
    const target: RestoreDrillTargetPort = {
      async initializeFresh() {},
      async seedTestData() {},
      async destroyTestData() {},
      async verifyRestoredData(): Promise<RestoreVerification> {
        return {
          tableCount: 29,
          migrationLedgerCount: 3,
          foreignKeyViolations: 0,
          tenantIsolationValid: true,
          auditEvidencePresent: true,
          criticalRecordCount: 0,
          integrityErrors: ["TABLE_COUNT_MISMATCH"],
        };
      },
    };
    const drill = new RestoreDrillService(
      harness.service,
      target,
      harness.idempotency,
      audit,
      new FixedClock(),
    );
    await expect(drill.run(
      "development",
      "release-local",
      Date.parse("2026-08-31T00:00:00Z"),
      context(),
    )).rejects.toMatchObject({ code: "RESTORE_INTEGRITY_FAILED" });
    expect(audit.records.map(({ action }) => action))
      .toContain("restore.drill.failure");
  });
  it("returns safe release health without paths, bindings, Database IDs, or credentials", () => {
    const evaluator = new ReleaseHealthEvaluator();
    const safe = evaluator.safeOutput(evaluator.evaluate(
      { releaseStatus: "healthy" },
      [{
        dependency: "internal-database-binding",
        healthy: false,
        reasonCode: "DEPENDENCY_UNAVAILABLE",
        checkedAt: 1,
      }],
    ));
    const serialized = JSON.stringify(safe);
    expect(safe).toMatchObject({
      healthy: false,
      dependencyCount: 1,
      failedDependencyCount: 1,
      reasonCodes: ["DEPENDENCY_UNAVAILABLE"],
    });
    expect(serialized).not.toMatch(/internal-database-binding|secret|credential|stack|path/i);
  });
});
