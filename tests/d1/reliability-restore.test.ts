import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import {
  BackupService,
  encodeSnapshot,
  LocalAuditEvidenceAdapter,
  LocalBackupOperationalEvidenceAdapter,
  LocalIdempotencyAdapter,
  LocalReliabilityRepository,
  LocalTestEncryptionAdapter,
  NoopBackupNotificationAdapter,
  RestoreDrillService,
  type BackupProviderPort,
  type BackupSnapshot,
  type BackupStoragePort,
  type RestoreDrillTargetPort,
  type RestoreProviderPort,
  type RestoreVerification,
} from "../../src/platform-reliability";
import { FixedClock, SequenceUuidV7 } from "../helpers";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
const tenantA = "01990000-0000-7000-8000-000000000001";
const tenantB = "01990000-0000-7000-8000-000000000002";
const auditA = "01990000-0000-7000-8000-000000000011";
const auditB = "01990000-0000-7000-8000-000000000012";

interface TenantBackupRow {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly created_at: number;
  readonly updated_at: number;
}

interface AuditBackupRow {
  readonly id: string;
  readonly scope_type: string;
  readonly tenant_id: string;
  readonly actor_type: string;
  readonly actor_reference: string;
  readonly action: string;
  readonly resource_type: string;
  readonly resource_reference: string;
  readonly decision: string;
  readonly reason_code: string;
  readonly correlation_reference: string;
  readonly occurred_at: number;
  readonly created_at: number;
}

interface D1BackupData {
  readonly tenants: readonly TenantBackupRow[];
  readonly audits: readonly AuditBackupRow[];
}

class D1RestoreHarness
implements BackupProviderPort, BackupStoragePort, RestoreProviderPort, RestoreDrillTargetPort {
  readonly providerName = "isolated-local-d1-memory";
  private readonly artifacts = new Map<string, Uint8Array>();

  async initializeFresh(): Promise<void> {
    const ledger = await env.DB.prepare(
      "SELECT count(*) AS count FROM d1_migrations",
    ).first<{ count: number }>();
    const tenants = await env.DB.prepare(
      "SELECT count(*) AS count FROM tenants",
    ).first<{ count: number }>();
    expect(ledger?.count).toBe(7);
    expect(tenants?.count).toBe(0);
  }

  async seedTestData(): Promise<void> {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO tenants (id, name, status, created_at, updated_at)
         VALUES (?1, ?2, 'active', 1, 1)`,
      ).bind(tenantA, "Restore Tenant A"),
      env.DB.prepare(
        `INSERT INTO tenants (id, name, status, created_at, updated_at)
         VALUES (?1, ?2, 'active', 1, 1)`,
      ).bind(tenantB, "Restore Tenant B"),
      this.auditStatement(auditA, tenantA, "tenant-a-resource"),
      this.auditStatement(auditB, tenantB, "tenant-b-resource"),
    ]);
  }

  async capture(): Promise<BackupSnapshot> {
    const [tenants, audits] = await Promise.all([
      env.DB.prepare(
        `SELECT id, name, status, created_at, updated_at
         FROM tenants WHERE id IN (?1, ?2) ORDER BY id`,
      ).bind(tenantA, tenantB).all<TenantBackupRow>(),
      env.DB.prepare(
        `SELECT id, scope_type, tenant_id, actor_type, actor_reference, action,
                resource_type, resource_reference, decision, reason_code,
                correlation_reference, occurred_at, created_at
         FROM audit_records WHERE id IN (?1, ?2) ORDER BY id`,
      ).bind(auditA, auditB).all<AuditBackupRow>(),
    ]);
    return encodeSnapshot("0007", 100, 4, {
      tenants: tenants.results,
      audits: audits.results,
    } satisfies D1BackupData);
  }

  async put(backupId: string, content: Uint8Array): Promise<string> {
    this.artifacts.set(backupId, content.slice());
    return `isolated-memory:${backupId}`;
  }

  async get(storageReference: string): Promise<Uint8Array | null> {
    return this.artifacts.get(
      storageReference.replace(/^isolated-memory:/, ""),
    )?.slice() ?? null;
  }

  async delete(storageReference: string): Promise<void> {
    this.artifacts.delete(storageReference.replace(/^isolated-memory:/, ""));
  }

  async destroyTestData(): Promise<void> {
    await env.DB.batch([
      env.DB.prepare(
        "DELETE FROM audit_records WHERE id IN (?1, ?2)",
      ).bind(auditA, auditB),
      env.DB.prepare(
        "DELETE FROM tenants WHERE id IN (?1, ?2)",
      ).bind(tenantA, tenantB),
    ]);
  }

  async restore(snapshot: BackupSnapshot): Promise<void> {
    const decoded = JSON.parse(new TextDecoder().decode(snapshot.content)) as {
      readonly data: D1BackupData;
    };
    const statements: D1PreparedStatement[] = [];
    for (const tenant of decoded.data.tenants) {
      statements.push(env.DB.prepare(
        `INSERT INTO tenants (id, name, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      ).bind(
        tenant.id,
        tenant.name,
        tenant.status,
        tenant.created_at,
        tenant.updated_at,
      ));
    }
    for (const audit of decoded.data.audits) {
      statements.push(env.DB.prepare(
        `INSERT INTO audit_records (
          id, scope_type, tenant_id, actor_type, actor_reference, action,
          resource_type, resource_reference, decision, reason_code,
          correlation_reference, occurred_at, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
      ).bind(
        audit.id,
        audit.scope_type,
        audit.tenant_id,
        audit.actor_type,
        audit.actor_reference,
        audit.action,
        audit.resource_type,
        audit.resource_reference,
        audit.decision,
        audit.reason_code,
        audit.correlation_reference,
        audit.occurred_at,
        audit.created_at,
      ));
    }
    await env.DB.batch(statements);
  }

  async verifyRestoredData(): Promise<RestoreVerification> {
    const [tables, ledger, violations, tenantACount, tenantBCount, audits] =
      await Promise.all([
        env.DB.prepare(
          `SELECT count(*) AS count FROM sqlite_master
           WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
             AND name NOT IN ('d1_migrations', '_cf_METADATA')`,
        ).first<{ count: number }>(),
        env.DB.prepare(
          "SELECT count(*) AS count FROM d1_migrations",
        ).first<{ count: number }>(),
        env.DB.prepare("PRAGMA foreign_key_check").all(),
        env.DB.prepare(
          "SELECT count(*) AS count FROM audit_records WHERE tenant_id = ?1",
        ).bind(tenantA).first<{ count: number }>(),
        env.DB.prepare(
          "SELECT count(*) AS count FROM audit_records WHERE tenant_id = ?1",
        ).bind(tenantB).first<{ count: number }>(),
        env.DB.prepare(
          "SELECT count(*) AS count FROM audit_records WHERE id IN (?1, ?2)",
        ).bind(auditA, auditB).first<{ count: number }>(),
      ]);
    return {
      tableCount: tables?.count ?? 0,
      migrationLedgerCount: ledger?.count ?? 0,
      foreignKeyViolations: violations.results.length,
      tenantIsolationValid: tenantACount?.count === 1 && tenantBCount?.count === 1,
      auditEvidencePresent: audits?.count === 2,
      criticalRecordCount: 4,
      integrityErrors: tables?.count === 57 ? [] : ["TABLE_COUNT_MISMATCH"],
    };
  }

  private auditStatement(
    id: string,
    tenantId: string,
    resourceReference: string,
  ): D1PreparedStatement {
    return env.DB.prepare(
      `INSERT INTO audit_records (
        id, scope_type, tenant_id, actor_type, actor_reference, action,
        resource_type, resource_reference, decision, reason_code,
        correlation_reference, occurred_at, created_at
      ) VALUES (
        ?1, 'tenant', ?2, 'service', 'restore-drill',
        'restore.seed', 'tenant', ?3, 'changed', 'LOCAL_DRILL',
        'restore-drill-correlation', 1, 1
      )`,
    ).bind(id, tenantId, resourceReference);
  }
}

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, [...migrations]);
});

describe("Platform Reliability Local D1 Restore Drill", () => {
  it("restores migration-aligned cross-Tenant data with integrity evidence", async () => {
    const harness = new D1RestoreHarness();
    const repository = new LocalReliabilityRepository();
    const idempotency = new LocalIdempotencyAdapter();
    const audit = new LocalAuditEvidenceAdapter();
    const clock = new FixedClock();
    const backups = new BackupService(
      harness,
      harness,
      harness,
      new LocalTestEncryptionAdapter(),
      new NoopBackupNotificationAdapter(),
      new LocalBackupOperationalEvidenceAdapter(),
      repository,
      idempotency,
      audit,
      clock,
      new SequenceUuidV7(),
    );
    const drill = new RestoreDrillService(
      backups,
      harness,
      idempotency,
      audit,
      clock,
    );
    const report = await drill.run(
      "development",
      "release-local-d1",
      Date.parse("2026-08-31T00:00:00Z"),
      {
        idempotencyKey: "restore-drill-local-d1",
        fingerprint: "restore-drill-v1",
        correlationId: "restore-drill-correlation",
      },
    );
    expect(report).toMatchObject({
      databaseVersion: "0007",
      backupOpenable: true,
      restoredRecordCount: 4,
      integrityErrorCount: 0,
      migrationLedgerCount: 7,
      tenantIsolationValid: true,
      auditEvidencePresent: true,
      checksumVerified: true,
      recoveryPoint: 100,
    });
    expect(await env.DB.prepare("PRAGMA foreign_key_check").all())
      .toMatchObject({ results: [] });
  });
});
