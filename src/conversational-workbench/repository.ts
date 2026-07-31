import type {
  ConversationSession,
  ConversationStatus,
  OperationPlan,
  WorkbenchResponse,
} from "./models";
import { WorkbenchError } from "./models";

interface SessionRow {
  id: string;
  tenant_id: string;
  application_id: string;
  actor_membership_id: string;
  channel_key: string;
  status: ConversationStatus;
  active_intent_key: string | null;
  current_step_key: string | null;
  version: number;
  expires_at: number;
}
interface PlanRow {
  id: string;
  tenant_id: string;
  application_id: string;
  conversation_id: string;
  plan_version: number;
  intent_key: string;
  intent_version: number;
  module_key: string;
  operation_key: string;
  safe_parameter_digest: string;
  parameters_json: string;
  risk_level: OperationPlan["riskLevel"];
  confirmation_required: number;
  confirmation_status: OperationPlan["confirmationStatus"];
  access_snapshot_reference: string;
  idempotency_key: string;
  status: OperationPlan["status"];
  version: number;
  expires_at: number;
}

const session = (row: SessionRow): ConversationSession => ({
  id: row.id,
  tenantId: row.tenant_id,
  applicationId: row.application_id,
  actorMembershipId: row.actor_membership_id,
  channelKey: row.channel_key,
  status: row.status,
  activeIntentKey: row.active_intent_key,
  currentStepKey: row.current_step_key,
  version: row.version,
  expiresAt: row.expires_at,
});
const plan = (row: PlanRow): OperationPlan => ({
  id: row.id,
  tenantId: row.tenant_id,
  applicationId: row.application_id,
  conversationId: row.conversation_id,
  planVersion: row.plan_version,
  intentKey: row.intent_key,
  intentVersion: row.intent_version,
  moduleKey: row.module_key,
  operationKey: row.operation_key,
  safeParameterDigest: row.safe_parameter_digest,
  parameters: JSON.parse(row.parameters_json) as Record<string, unknown>,
  riskLevel: row.risk_level,
  confirmationRequired: row.confirmation_required === 1,
  confirmationStatus: row.confirmation_status,
  accessSnapshotReference: row.access_snapshot_reference,
  idempotencyKey: row.idempotency_key,
  status: row.status,
  version: row.version,
  expiresAt: row.expires_at,
});

const SESSION_COLUMNS =
  "id,tenant_id,application_id,actor_membership_id,channel_key,status,active_intent_key,current_step_key,version,expires_at";
const PLAN_COLUMNS =
  "id,tenant_id,application_id,conversation_id,plan_version,intent_key,intent_version,module_key,operation_key,safe_parameter_digest,parameters_json,risk_level,confirmation_required,confirmation_status,access_snapshot_reference,idempotency_key,status,version,expires_at";

export class D1WorkbenchRepository {
  constructor(private readonly db: D1Database) {}

  async findActiveSession(
    tenantId: string,
    applicationId: string,
    actorMembershipId: string,
    channelKey: string,
    now: number,
  ): Promise<ConversationSession | null> {
    const row = await this.db
      .prepare(
        `SELECT ${SESSION_COLUMNS} FROM conversation_sessions WHERE tenant_id=?1 AND application_id=?2 AND actor_membership_id=?3 AND channel_key=?4 AND status IN ('active','waiting_for_input','waiting_for_confirmation','processing') AND expires_at>?5 ORDER BY updated_at DESC,id DESC LIMIT 1`,
      )
      .bind(tenantId, applicationId, actorMembershipId, channelKey, now)
      .first<SessionRow>();
    return row ? session(row) : null;
  }

  async createSession(value: ConversationSession, now: number): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO conversation_sessions(id,tenant_id,application_id,actor_membership_id,channel_key,status,active_intent_key,current_step_key,version,expires_at,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,1,?9,?10,?10)",
      )
      .bind(
        value.id,
        value.tenantId,
        value.applicationId,
        value.actorMembershipId,
        value.channelKey,
        value.status,
        value.activeIntentKey,
        value.currentStepKey,
        value.expiresAt,
        now,
      )
      .run();
  }

  async updateSession(
    value: ConversationSession,
    next: Pick<
      ConversationSession,
      "status" | "activeIntentKey" | "currentStepKey" | "expiresAt"
    >,
    now: number,
  ): Promise<ConversationSession> {
    const result = await this.db
      .prepare(
        "UPDATE conversation_sessions SET status=?1,active_intent_key=?2,current_step_key=?3,expires_at=?4,version=version+1,updated_at=?5 WHERE tenant_id=?6 AND id=?7 AND version=?8 AND status NOT IN ('completed','cancelled','expired')",
      )
      .bind(
        next.status,
        next.activeIntentKey,
        next.currentStepKey,
        next.expiresAt,
        now,
        value.tenantId,
        value.id,
        value.version,
      )
      .run();
    if (result.meta.changes !== 1) throw new WorkbenchError("PLAN_STALE");
    return { ...value, ...next, version: value.version + 1 };
  }

  async findContextMessage(
    tenantId: string,
    applicationId: string,
    actorMembershipId: string,
    channelKey: string,
    messageKey: string,
  ): Promise<{ digest: string; response: WorkbenchResponse } | null> {
    const row = await this.db
      .prepare(
        "SELECT m.message_digest,m.response_json FROM conversation_messages m JOIN conversation_sessions s ON s.tenant_id=m.tenant_id AND s.id=m.conversation_id WHERE m.tenant_id=?1 AND m.application_id=?2 AND s.actor_membership_id=?3 AND s.channel_key=?4 AND m.message_key=?5 ORDER BY m.created_at DESC,m.id DESC LIMIT 1",
      )
      .bind(tenantId, applicationId, actorMembershipId, channelKey, messageKey)
      .first<{ message_digest: string; response_json: string }>();
    return row
      ? {
          digest: row.message_digest,
          response: JSON.parse(row.response_json) as WorkbenchResponse,
        }
      : null;
  }
  async findMessage(
    tenantId: string,
    conversationId: string,
    messageKey: string,
  ): Promise<{ digest: string; response: WorkbenchResponse } | null> {
    const row = await this.db
      .prepare(
        "SELECT message_digest,response_json FROM conversation_messages WHERE tenant_id=?1 AND conversation_id=?2 AND message_key=?3",
      )
      .bind(tenantId, conversationId, messageKey)
      .first<{ message_digest: string; response_json: string }>();
    return row
      ? {
          digest: row.message_digest,
          response: JSON.parse(row.response_json) as WorkbenchResponse,
        }
      : null;
  }

  async saveMessage(input: {
    id: string;
    tenantId: string;
    applicationId: string;
    conversationId: string;
    messageKey: string;
    messageDigest: string;
    intentKey: string | null;
    response: WorkbenchResponse;
    createdAt: number;
  }): Promise<void> {
    const json = JSON.stringify(input.response);
    if (json.length > 8192) throw new TypeError("response too large");
    await this.db
      .prepare(
        "INSERT INTO conversation_messages(id,tenant_id,application_id,conversation_id,message_key,message_digest,resolved_intent_key,response_status,response_json,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
      )
      .bind(
        input.id,
        input.tenantId,
        input.applicationId,
        input.conversationId,
        input.messageKey,
        input.messageDigest,
        input.intentKey,
        input.response.status,
        json,
        input.createdAt,
      )
      .run();
  }

  async currentSlots(
    tenantId: string,
    conversationId: string,
  ): Promise<Readonly<Record<string, unknown>>> {
    const result = await this.db
      .prepare(
        "SELECT slot_key,value_json FROM conversation_slot_values WHERE tenant_id=?1 AND conversation_id=?2 AND status='current' ORDER BY slot_key LIMIT 64",
      )
      .bind(tenantId, conversationId)
      .all<{ slot_key: string; value_json: string }>();
    return Object.freeze(
      Object.fromEntries(
        result.results.map((row) => [
          row.slot_key,
          JSON.parse(row.value_json) as unknown,
        ]),
      ),
    );
  }

  async saveSlot(input: {
    id: string;
    tenantId: string;
    applicationId: string;
    conversationId: string;
    slotKey: string;
    slotType: string;
    value: unknown;
    createdAt: number;
  }): Promise<void> {
    const row = await this.db
      .prepare(
        "SELECT COALESCE(MAX(revision),0) revision FROM conversation_slot_values WHERE tenant_id=?1 AND conversation_id=?2 AND slot_key=?3",
      )
      .bind(input.tenantId, input.conversationId, input.slotKey)
      .first<{ revision: number }>();
    const revision = (row?.revision ?? 0) + 1,
      valueJson = JSON.stringify(input.value);
    if (valueJson.length > 2048) throw new TypeError("slot value too large");
    await this.db.batch([
      this.db
        .prepare(
          "UPDATE conversation_slot_values SET status='superseded' WHERE tenant_id=?1 AND conversation_id=?2 AND slot_key=?3 AND status='current'",
        )
        .bind(input.tenantId, input.conversationId, input.slotKey),
      this.db
        .prepare(
          "INSERT INTO conversation_slot_values(id,tenant_id,application_id,conversation_id,slot_key,slot_type,value_json,revision,status,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,'current',?9)",
        )
        .bind(
          input.id,
          input.tenantId,
          input.applicationId,
          input.conversationId,
          input.slotKey,
          input.slotType,
          valueJson,
          revision,
          input.createdAt,
        ),
    ]);
  }

  async latestOpenPlan(
    tenantId: string,
    conversationId: string,
  ): Promise<OperationPlan | null> {
    const row = await this.db
      .prepare(
        `SELECT ${PLAN_COLUMNS} FROM operation_plans WHERE tenant_id=?1 AND conversation_id=?2 AND status IN ('prepared','awaiting_confirmation','approved','executing') ORDER BY plan_version DESC LIMIT 1`,
      )
      .bind(tenantId, conversationId)
      .first<PlanRow>();
    return row ? plan(row) : null;
  }

  async createPlan(value: OperationPlan, now: number): Promise<void> {
    const json = JSON.stringify(value.parameters);
    if (json.length > 8192) throw new TypeError("plan parameters too large");
    await this.db
      .prepare(
        "INSERT INTO operation_plans(id,tenant_id,application_id,conversation_id,plan_version,intent_key,intent_version,module_key,operation_key,safe_parameter_digest,parameters_json,risk_level,confirmation_required,confirmation_status,access_snapshot_reference,idempotency_key,status,version,expires_at,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,1,?18,?19,?19)",
      )
      .bind(
        value.id,
        value.tenantId,
        value.applicationId,
        value.conversationId,
        value.planVersion,
        value.intentKey,
        value.intentVersion,
        value.moduleKey,
        value.operationKey,
        value.safeParameterDigest,
        json,
        value.riskLevel,
        value.confirmationRequired ? 1 : 0,
        value.confirmationStatus,
        value.accessSnapshotReference,
        value.idempotencyKey,
        value.status,
        value.expiresAt,
        now,
      )
      .run();
  }

  async transitionPlan(
    value: OperationPlan,
    status: OperationPlan["status"],
    confirmationStatus: OperationPlan["confirmationStatus"],
    now: number,
  ): Promise<OperationPlan> {
    const result = await this.db
      .prepare(
        "UPDATE operation_plans SET status=?1,confirmation_status=?2,version=version+1,updated_at=?3 WHERE tenant_id=?4 AND id=?5 AND version=?6",
      )
      .bind(
        status,
        confirmationStatus,
        now,
        value.tenantId,
        value.id,
        value.version,
      )
      .run();
    if (result.meta.changes !== 1) throw new WorkbenchError("PLAN_STALE");
    return { ...value, status, confirmationStatus, version: value.version + 1 };
  }

  async saveConfirmation(input: {
    id: string;
    tenantId: string;
    applicationId: string;
    planId: string;
    actorMembershipId: string;
    planVersion: number;
    confirmationKey: string;
    decision: "approved" | "rejected";
    createdAt: number;
  }): Promise<void> {
    await this.db
      .prepare(
        "INSERT OR IGNORE INTO operation_confirmations(id,tenant_id,application_id,operation_plan_id,actor_membership_id,plan_version,confirmation_key,decision,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
      )
      .bind(
        input.id,
        input.tenantId,
        input.applicationId,
        input.planId,
        input.actorMembershipId,
        input.planVersion,
        input.confirmationKey,
        input.decision,
        input.createdAt,
      )
      .run();
  }

  async executionResponse(
    tenantId: string,
    planId: string,
  ): Promise<WorkbenchResponse | null> {
    const row = await this.db
      .prepare(
        "SELECT response_json FROM operation_execution_records WHERE tenant_id=?1 AND operation_plan_id=?2",
      )
      .bind(tenantId, planId)
      .first<{ response_json: string }>();
    return row ? (JSON.parse(row.response_json) as WorkbenchResponse) : null;
  }

  async saveExecution(input: {
    id: string;
    tenantId: string;
    applicationId: string;
    planId: string;
    idempotencyKey: string;
    status: "succeeded" | "failed";
    response: WorkbenchResponse;
    supportCode: string | null;
    startedAt: number;
    completedAt: number;
  }): Promise<void> {
    const json = JSON.stringify(input.response);
    if (json.length > 8192) throw new TypeError("execution response too large");
    await this.db
      .prepare(
        "INSERT OR IGNORE INTO operation_execution_records(id,tenant_id,application_id,operation_plan_id,idempotency_key,status,response_json,support_code,started_at,completed_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
      )
      .bind(
        input.id,
        input.tenantId,
        input.applicationId,
        input.planId,
        input.idempotencyKey,
        input.status,
        json,
        input.supportCode,
        input.startedAt,
        input.completedAt,
      )
      .run();
  }
}
