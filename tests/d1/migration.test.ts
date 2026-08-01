import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];

const expectedTables = [
  "ai_budget_leases",
  "ai_budgets",
  "ai_cache_entries",
  "ai_canary_plans",
  "ai_model_catalog",
  "ai_provider_approval_records",
  "ai_provider_catalog",
  "ai_provider_compliance_profiles",
  "ai_provider_data_policies",
  "ai_provider_enablements",
  "ai_provider_hard_ceilings",
  "ai_provider_incident_runbooks",
  "ai_provider_kill_switches",
  "ai_provider_readiness_assessments",
  "ai_provider_rollback_plans",
  "ai_provider_secret_references",
  "ai_request_records",
  "ai_route_policies",
  "ai_shadow_plans",
  "ai_task_provider_allow_matrix",
  "ai_task_registry",
  "ai_usage_records",
  "alert_delivery_records",
  "alert_policies",
  "application_configuration",
  "application_module_configuration",
  "application_module_enablements",
  "application_module_entitlements",
  "applications",
  "attribution_records",
  "audit_records",
  "business_relationships",
  "circuit_breaker_states",
  "commission_records",
  "commission_rules",
  "conversation_messages",
  "conversation_sessions",
  "conversation_slot_values",
  "degradation_states",
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
  "incident_events",
  "incidents",
  "intent_registry",
  "module_catalog",
  "module_dependencies",
  "module_entitlement_history",
  "network_partners",
  "observation_events",
  "operation_confirmations",
  "operation_execution_records",
  "operation_plans",
  "partner_team_memberships",
  "partner_teams",
  "permissions",
  "platform_users",
  "rate_limit_evidence",
  "referral_links",
  "referral_touches",
  "role_assignments",
  "role_permissions",
  "roles",
  "sales_records",
  "support_code_mappings",
  "tenant_memberships",
  "tenant_resource_snapshots",
  "tenants",
  "traffic_policy_records",
  "webhook_receipts",
];

const expectedIndexes = [
  "idx_ai_budget_leases_expiry",
  "idx_ai_budgets_window",
  "idx_ai_cache_expiry",
  "idx_ai_cache_lookup",
  "idx_ai_canary_status",
  "idx_ai_compliance_expiry",
  "idx_ai_data_policy_lookup",
  "idx_ai_enablement_provider_env_status",
  "idx_ai_hard_ceiling_lookup",
  "idx_ai_kill_switch_scope",
  "idx_ai_models_route",
  "idx_ai_approval_expiry",
  "idx_ai_requests_status",
  "idx_ai_readiness_result",
  "idx_ai_rollback_lookup",
  "idx_ai_runbook_lookup",
  "idx_ai_routes_selection",
  "idx_ai_tasks_active",
  "idx_ai_secret_reference_lookup",
  "idx_ai_shadow_status",
  "idx_ai_task_provider_matrix",
  "idx_ai_usage_application_task",
  "idx_ai_usage_tenant_time",
  "uq_ai_route_application_active",
  "uq_ai_route_platform_active",
  "uq_ai_route_tenant_active",
  "idx_alert_delivery_incident_time",
  "idx_alert_delivery_retry",
  "idx_alert_policy_selection",
  "idx_app_config_tenant",
  "idx_applications_tenant_status",
  "idx_attribution_partner_time",
  "idx_audit_resource_time",
  "idx_audit_tenant_time",
  "idx_catalog_availability",
  "idx_circuit_dependency_state",
  "idx_circuit_tenant_state",
  "idx_commission_partner_time",
  "idx_commission_rule_match",
  "idx_commission_status_time",
  "idx_conversation_actor_active",
  "idx_conversation_message_session",
  "idx_conversation_session_scope",
  "idx_conversation_slot_history",
  "idx_degradation_scope_time",
  "idx_dependencies_module",
  "idx_dependencies_reverse",
  "idx_enablement_enabled",
  "idx_enablement_module",
  "idx_entitlement_access",
  "idx_entitlement_expiry",
  "idx_entitlement_history_app",
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
  "idx_event_sessions_reconciliation",
  "idx_event_sessions_tenant_time",
  "idx_event_share_links_event_status",
  "idx_event_share_touches_event_time",
  "idx_event_share_touches_link_time",
  "idx_events_tenant_status_updated",
  "idx_idempotency_scope_status_expiry",
  "idx_idempotency_tenant_expiry",
  "idx_identity_mappings_user",
  "idx_incident_events_incident_time",
  "idx_incident_events_observation",
  "idx_incident_status_severity",
  "idx_incident_tenant_time",
  "idx_intent_registry_active",
  "idx_module_config_tenant",
  "idx_network_partner_tenant_status",
  "idx_observation_environment_severity_time",
  "idx_observation_reason_time",
  "idx_observation_retention",
  "idx_observation_tenant_time",
  "idx_operation_confirmation_plan",
  "idx_operation_execution_idempotency",
  "idx_operation_execution_plan",
  "idx_operation_plan_conversation",
  "idx_operation_plan_idempotency",
  "idx_operation_plan_status_expiry",
  "idx_rate_limit_expiry",
  "idx_rate_limit_scope_window",
  "idx_rate_limit_tenant_window",
  "idx_referral_link_partner_status",
  "idx_referral_touch_link_time",
  "idx_referral_touch_partner_time",
  "idx_referral_touch_visitor_time",
  "idx_relationship_source_status",
  "idx_relationship_target_status",
  "idx_role_assignments_member",
  "idx_roles_tenant_status",
  "idx_sales_seller_time",
  "idx_sales_tenant_time",
  "idx_support_code_expiry",
  "idx_support_code_tenant_expiry",
  "idx_team_membership_partner",
  "idx_team_tenant_status",
  "idx_tenant_memberships_tenant_status",
  "idx_tenant_resource_expiry",
  "idx_traffic_policy_selection",
  "idx_webhook_expiry_status",
  "idx_webhook_processing_lease",
  "idx_webhook_tenant_expiry",
  "idx_webhook_tenant_lease",
  "uq_alert_delivery_key",
  "uq_business_relationship_active",
  "uq_business_relationship_target_active",
  "uq_circuit_scope",
  "uq_commission_primary_sale",
  "uq_commission_reversal",
  "uq_conversation_current_slot",
  "uq_degradation_active",
  "uq_entitlement_current",
  "uq_event_checkins_qr_digest",
  "uq_event_checkins_verified_registration",
  "uq_event_form_fields_active_key",
  "uq_event_notifications_waitlist_promoted",
  "uq_event_registrations_active_user",
  "uq_idempotency_platform",
  "uq_idempotency_tenant",
  "uq_identity_mappings_active",
  "uq_incident_scope_fingerprint",
  "uq_network_partner_active_user",
  "uq_role_assignments_active",
  "uq_roles_core_key",
  "uq_roles_tenant_key",
  "uq_team_membership_active",
  "uq_tenant_memberships_active",
  "uq_tenant_resource_window",
  "uq_traffic_policy_active",
  "uq_webhook_event",
];

const expectedTriggers = [
  "trg_ai_budget_no_delete",
  "trg_ai_budget_version_guard",
  "trg_ai_cache_no_delete",
  "trg_ai_cache_update_guard",
  "trg_ai_canary_no_delete",
  "trg_ai_canary_no_update",
  "trg_ai_compliance_no_delete",
  "trg_ai_compliance_no_update",
  "trg_ai_data_policy_no_delete",
  "trg_ai_data_policy_no_update",
  "trg_ai_enablement_insert_guard",
  "trg_ai_enablement_no_delete",
  "trg_ai_enablement_no_update",
  "trg_ai_hard_ceiling_no_delete",
  "trg_ai_hard_ceiling_no_update",
  "trg_ai_kill_switch_no_delete",
  "trg_ai_kill_switch_no_update",
  "trg_ai_kill_switch_version_guard",
  "trg_ai_lease_insert_guard",
  "trg_ai_lease_release_budget",
  "trg_ai_lease_no_delete",
  "trg_ai_lease_update_guard",
  "trg_ai_model_no_delete",
  "trg_ai_model_version_guard",
  "trg_ai_provider_no_delete",
  "trg_ai_provider_version_guard",
  "trg_ai_request_no_delete",
  "trg_ai_request_update_guard",
  "trg_ai_approval_no_delete",
  "trg_ai_approval_no_update",
  "trg_ai_readiness_no_delete",
  "trg_ai_readiness_no_update",
  "trg_ai_rollback_no_delete",
  "trg_ai_rollback_no_update",
  "trg_ai_runbook_no_delete",
  "trg_ai_runbook_no_update",
  "trg_ai_route_no_delete",
  "trg_ai_route_version_guard",
  "trg_ai_task_identity_guard",
  "trg_ai_task_no_delete",
  "trg_ai_secret_reference_no_delete",
  "trg_ai_secret_reference_no_update",
  "trg_ai_shadow_no_delete",
  "trg_ai_shadow_no_update",
  "trg_ai_matrix_no_delete",
  "trg_ai_matrix_no_update",
  "trg_ai_usage_no_delete",
  "trg_ai_usage_no_update",
  "trg_alert_delivery_attempt_guard",
  "trg_alert_delivery_lifecycle_guard",
  "trg_alert_delivery_no_delete",
  "trg_alert_policy_no_delete",
  "trg_app_config_no_delete",
  "trg_app_config_version_guard",
  "trg_application_archive_terminal",
  "trg_application_version_guard",
  "trg_attribution_immutable_delete",
  "trg_attribution_immutable_update",
  "trg_business_relationship_no_delete",
  "trg_catalog_version_guard",
  "trg_circuit_state_identity_guard",
  "trg_circuit_state_no_delete",
  "trg_circuit_state_transition_guard",
  "trg_commission_no_delete",
  "trg_commission_paid_immutable",
  "trg_conversation_message_no_delete",
  "trg_conversation_message_no_update",
  "trg_conversation_no_delete",
  "trg_conversation_terminal_guard",
  "trg_conversation_version_guard",
  "trg_core_role_permissions_immutable_delete",
  "trg_core_role_permissions_immutable_insert",
  "trg_core_role_permissions_immutable_update",
  "trg_core_roles_immutable_delete",
  "trg_core_roles_immutable_update",
  "trg_degradation_state_lifecycle_guard",
  "trg_degradation_state_no_delete",
  "trg_dependency_no_delete",
  "trg_dependency_no_update",
  "trg_enablement_identity_guard",
  "trg_enablement_no_delete",
  "trg_entitlement_history_no_delete",
  "trg_entitlement_history_no_update",
  "trg_entitlement_identity_guard",
  "trg_entitlement_no_delete",
  "trg_entitlement_transition_guard",
  "trg_event_checkin_guard",
  "trg_event_checkin_no_delete",
  "trg_event_registration_insert_count",
  "trg_event_registration_insert_guard",
  "trg_event_registration_no_delete",
  "trg_event_registration_status_count",
  "trg_event_registration_status_guard",
  "trg_event_session_reconciliation_clear_guard",
  "trg_events_terminal_status",
  "trg_incident_events_no_delete",
  "trg_incident_events_no_update",
  "trg_incident_identity_guard",
  "trg_incident_lifecycle_guard",
  "trg_incident_no_delete",
  "trg_intent_registry_no_delete",
  "trg_intent_registry_no_update",
  "trg_last_owner_assignment_delete",
  "trg_last_owner_assignment_revoke",
  "trg_last_owner_membership_change",
  "trg_membership_requires_active_user_activate",
  "trg_membership_requires_active_user_insert",
  "trg_module_config_no_delete",
  "trg_module_config_version_guard",
  "trg_observation_anonymize_guard",
  "trg_observation_no_delete",
  "trg_observation_retention_transition_guard",
  "trg_observation_update_guard",
  "trg_operation_confirmation_no_delete",
  "trg_operation_confirmation_no_update",
  "trg_operation_execution_no_delete",
  "trg_operation_execution_no_update",
  "trg_operation_plan_identity_guard",
  "trg_operation_plan_no_delete",
  "trg_permissions_immutable_delete",
  "trg_permissions_immutable_insert",
  "trg_permissions_immutable_update",
  "trg_platform_users_terminal_state",
  "trg_rate_limit_evidence_no_delete",
  "trg_rate_limit_evidence_no_update",
  "trg_role_assignment_active_membership",
  "trg_sales_no_delete",
  "trg_slot_revision_no_delete",
  "trg_slot_revision_update_guard",
  "trg_support_code_no_delete",
  "trg_support_code_no_update",
  "trg_tenant_resource_snapshot_no_delete",
  "trg_tenant_resource_snapshot_no_update",
  "trg_traffic_policy_lifecycle_guard",
  "trg_traffic_policy_no_delete",
  "trg_webhook_receipt_no_delete",
  "trg_webhook_receipt_update_guard",
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

    expect(tables.results.map(({ name }) => name)).toEqual([...expectedTables].sort());
    expect(indexes.results.map(({ name }) => name)).toEqual([...expectedIndexes].sort());
    expect(triggers.results.map(({ name }) => name)).toEqual([...expectedTriggers].sort());
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
    expect(await foreignKeySignatures("webhook_receipts")).toEqual(["tenant_id->tenants.id"]);
    expect(await foreignKeySignatures("rate_limit_evidence")).toEqual(["tenant_id->tenants.id"]);
    expect(await foreignKeySignatures("tenant_resource_snapshots")).toEqual(["tenant_id->tenants.id"]);
    expect(await foreignKeySignatures("circuit_breaker_states")).toEqual(["tenant_id->tenants.id"]);
    expect(await foreignKeySignatures("degradation_states")).toEqual(["tenant_id->tenants.id"]);
    expect(await foreignKeySignatures("traffic_policy_records")).toEqual(["tenant_id->tenants.id"]);

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

    expect(counts.map((row) => row?.count)).toEqual([75, 3, 9]);
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
