import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];

const expectedTables = [
  "audit_records",
  "event_checkins",
  "event_form_fields",
  "event_notifications",
  "event_payments",
  "event_registration_answers",
  "event_registrations",
  "event_sessions",
  "event_share_links",
  "event_share_touches",
  "events",
  "idempotency_records",
  "identity_mappings",
  "permissions",
  "platform_users",
  "role_assignments",
  "role_permissions",
  "roles",
  "tenant_memberships",
  "tenants",
];

const expectedIndexes = [
  "idx_audit_resource_time",
  "idx_audit_tenant_time",
  "idx_event_answers_registration",
  "idx_event_checkins_session_time",
  "idx_event_form_fields_event_order",
  "idx_event_notifications_pending",
  "idx_event_notifications_registration",
  "idx_event_payments_status",
  "idx_event_registrations_roster",
  "idx_event_registrations_user",
  "idx_event_registrations_waitlist",
  "idx_event_sessions_event_time",
  "idx_event_sessions_tenant_time",
  "idx_event_share_links_event_status",
  "idx_event_share_touches_event_time",
  "idx_event_share_touches_link_time",
  "idx_events_tenant_status_updated",
  "idx_idempotency_scope_status_expiry",
  "idx_idempotency_tenant_expiry",
  "idx_identity_mappings_user",
  "idx_role_assignments_member",
  "idx_roles_tenant_status",
  "idx_tenant_memberships_tenant_status",
  "uq_event_checkins_qr_digest",
  "uq_event_checkins_verified_registration",
  "uq_event_form_fields_active_key",
  "uq_event_registrations_active_user",
  "uq_idempotency_platform",
  "uq_idempotency_tenant",
  "uq_identity_mappings_active",
  "uq_role_assignments_active",
  "uq_roles_core_key",
  "uq_roles_tenant_key",
  "uq_tenant_memberships_active",
];

const expectedTriggers = [
  "trg_core_role_permissions_immutable_delete",
  "trg_core_role_permissions_immutable_insert",
  "trg_core_role_permissions_immutable_update",
  "trg_core_roles_immutable_delete",
  "trg_core_roles_immutable_update",
  "trg_event_checkin_guard",
  "trg_event_checkin_no_delete",
  "trg_event_registration_insert_count",
  "trg_event_registration_insert_guard",
  "trg_event_registration_no_delete",
  "trg_event_registration_status_count",
  "trg_event_registration_status_guard",
  "trg_events_terminal_status",
  "trg_last_owner_assignment_delete",
  "trg_last_owner_assignment_revoke",
  "trg_last_owner_membership_change",
  "trg_membership_requires_active_user_activate",
  "trg_membership_requires_active_user_insert",
  "trg_permissions_immutable_delete",
  "trg_permissions_immutable_insert",
  "trg_permissions_immutable_update",
  "trg_platform_users_terminal_state",
  "trg_role_assignment_active_membership",
];

interface ForeignKeyRow {
  table: string;
  from: string;
  to: string;
}

async function foreignKeySignatures(table: string): Promise<string[]> {
  const result = await env.DB.prepare(`PRAGMA foreign_key_list(${table})`).all<ForeignKeyRow>();
  return result.results.map((row) => `${row.from}->${row.table}.${row.to}`).sort();
}

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, [...migrations]);
});

describe("Phase 1 local D1 migration", () => {
  it("rebuilds the complete formal schema from a fresh local database", async () => {
    const tables = await env.DB.prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations', '_cf_METADATA')
       ORDER BY name`,
    ).all<{ name: string }>();
    const indexes = await env.DB.prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex_%'
       ORDER BY name`,
    ).all<{ name: string }>();
    const triggers = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name`,
    ).all<{ name: string }>();

    expect(tables.results.map(({ name }) => name)).toEqual(expectedTables);
    expect(indexes.results.map(({ name }) => name)).toEqual(expectedIndexes);
    expect(triggers.results.map(({ name }) => name)).toEqual(expectedTriggers);
  });

  it("defines every expected tenant-aware foreign key in the formal migration", async () => {
    const foreignKeys = await env.DB.prepare("PRAGMA foreign_keys").first<{ foreign_keys: number }>();
    expect(foreignKeys?.foreign_keys).toBe(1);

    expect(await foreignKeySignatures("platform_users")).toEqual([
      "merged_into_user_id->platform_users.id",
    ]);
    expect(await foreignKeySignatures("identity_mappings")).toEqual([
      "platform_user_id->platform_users.id",
    ]);
    expect(await foreignKeySignatures("tenant_memberships")).toEqual([
      "merged_into_membership_id->tenant_memberships.id",
      "platform_user_id->platform_users.id",
      "tenant_id->tenant_memberships.tenant_id",
      "tenant_id->tenants.id",
    ]);
    expect(await foreignKeySignatures("roles")).toEqual(["tenant_id->tenants.id"]);
    expect(await foreignKeySignatures("role_permissions")).toEqual([
      "permission_id->permissions.id",
      "role_id->roles.id",
      "tenant_scope_key->roles.tenant_scope_key",
    ]);
    expect(await foreignKeySignatures("role_assignments")).toEqual([
      "role_id->roles.id",
      "role_scope_key->roles.tenant_scope_key",
      "tenant_id->tenant_memberships.tenant_id",
      "tenant_membership_id->tenant_memberships.id",
    ]);
    expect(await foreignKeySignatures("idempotency_records")).toEqual(["tenant_id->tenants.id"]);
    expect(await foreignKeySignatures("audit_records")).toEqual(["tenant_id->tenants.id"]);

    const violations = await env.DB.prepare("PRAGMA foreign_key_check").all();
    expect(violations.results).toEqual([]);
  });

  it("is repeat-safe through the D1 migration ledger", async () => {
    await applyD1Migrations(env.DB, [...migrations]);
    const counts = await Promise.all([
      env.DB.prepare("SELECT count(*) AS count FROM permissions").first<{ count: number }>(),
      env.DB.prepare("SELECT count(*) AS count FROM roles WHERE scope_type = 'core'").first<{ count: number }>(),
      env.DB.prepare("SELECT count(*) AS count FROM d1_migrations").first<{ count: number }>(),
    ]);

    expect(counts.map((row) => row?.count)).toEqual([8, 3, 2]);
  });

  it("keeps Core Roles, Core grants, and the Permission vocabulary immutable", async () => {
    await expect(
      env.DB.prepare(
        `UPDATE roles SET name = 'Changed' WHERE scope_type = 'core' AND role_key = 'tenant_owner'`,
      ).run(),
    ).rejects.toThrow(/core_role_immutable/);
    await expect(
      env.DB.prepare(`DELETE FROM roles WHERE scope_type = 'core' AND role_key = 'tenant_owner'`).run(),
    ).rejects.toThrow(/core_role_immutable/);

    await expect(
      env.DB.prepare(
        `INSERT INTO role_permissions (tenant_scope_key, role_id, permission_id, created_at)
         VALUES ('core', '018f0000-0000-7000-8000-000000000201',
                 '018f0000-0000-7000-8000-000000000101', 1)`,
      ).run(),
    ).rejects.toThrow(/core_role_permission_immutable/);
    await expect(
      env.DB.prepare(
        `UPDATE role_permissions SET created_at = 1
         WHERE tenant_scope_key = 'core' AND role_id = '018f0000-0000-7000-8000-000000000201'`,
      ).run(),
    ).rejects.toThrow(/core_role_permission_immutable/);
    await expect(
      env.DB.prepare(
        `DELETE FROM role_permissions
         WHERE tenant_scope_key = 'core' AND role_id = '018f0000-0000-7000-8000-000000000201'`,
      ).run(),
    ).rejects.toThrow(/core_role_permission_immutable/);

    await expect(
      env.DB.prepare(
        `INSERT INTO permissions (id, permission_key, description, status, created_at, updated_at)
         VALUES ('01980000-0000-7000-8000-000000009991', 'test:write', 'Test', 'active', 1, 1)`,
      ).run(),
    ).rejects.toThrow(/permission_vocabulary_immutable/);
    await expect(
      env.DB.prepare(
        `UPDATE permissions SET description = 'Changed' WHERE permission_key = 'tenant:read'`,
      ).run(),
    ).rejects.toThrow(/permission_vocabulary_immutable/);
    await expect(
      env.DB.prepare(`DELETE FROM permissions WHERE permission_key = 'tenant:read'`).run(),
    ).rejects.toThrow(/permission_vocabulary_immutable/);
  });

  it("enforces foreign keys and uses the required migration indexes", async () => {
    await expect(
      env.DB.prepare(
        `INSERT INTO tenant_memberships (
          id, tenant_id, platform_user_id, status, join_source, joined_at,
          suspended_at, closed_at, merged_into_membership_id, created_at, updated_at
        ) VALUES (
          '01980000-0000-7000-8000-000000009999',
          '01980000-0000-7000-8000-000000009998',
          '01980000-0000-7000-8000-000000009997',
          'active', 'test', 1, NULL, NULL, NULL, 1, 1
        )`,
      ).run(),
    ).rejects.toThrow();

    const plans = await Promise.all([
      env.DB.prepare(
        `EXPLAIN QUERY PLAN SELECT id FROM idempotency_records
         WHERE scope_type = ?1 AND status = ?2 AND expires_at <= ?3 LIMIT 100`,
      ).bind("platform", "processing", 1).all<{ detail: string }>(),
      env.DB.prepare(
        `EXPLAIN QUERY PLAN SELECT id FROM role_assignments
         WHERE tenant_id = ?1 AND tenant_membership_id = ?2 AND status = 'active'`,
      ).bind("tenant", "member").all<{ detail: string }>(),
      env.DB.prepare(
        `EXPLAIN QUERY PLAN SELECT id FROM audit_records
         WHERE tenant_id = ?1 ORDER BY occurred_at DESC, id DESC LIMIT 100`,
      ).bind("tenant").all<{ detail: string }>(),
    ]);
    const details = plans.flatMap((plan) => plan.results.map(({ detail }) => detail)).join("\n");
    expect(details).toContain("idx_idempotency_scope_status_expiry");
    expect(details).toMatch(/idx_role_assignments_member|uq_role_assignments_active/);
    expect(details).toContain("idx_audit_tenant_time");
  });
});
