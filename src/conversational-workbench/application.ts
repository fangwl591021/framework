import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import { canonicalJson, sha256Hex } from "../persistence/crypto";
import type {
  ConversationSession,
  IntentDefinition,
  OperationPlan,
  TrustedConversationContext,
  WorkbenchInput,
  WorkbenchResponse,
} from "./models";
import { WorkbenchError } from "./models";
import type {
  WorkbenchAuthorizationPort,
  WorkbenchObservationPort,
} from "./ports";
import { getIntent, slotDefinitions } from "./registry";
import type { IntentResolverPort } from "./resolver";
import { missingSlotPrompt, SlotValidator } from "./slots";
import { D1WorkbenchRepository } from "./repository";
import { AllowlistedOperationRouter } from "./router";

const SESSION_TTL = 30 * 60 * 1000,
  PLAN_TTL = 10 * 60 * 1000;
const confirmations = new Set(["確認", "確定執行", "confirm", "yes"]),
  cancellations = new Set(["取消", "cancel", "no"]);

function normalizeConfirmation(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[。！!\s]/g, "");
}

export class ConversationalWorkbenchApplication {
  private readonly slots = new SlotValidator();
  constructor(
    private readonly repository: D1WorkbenchRepository,
    private readonly resolver: IntentResolverPort,
    private readonly router: AllowlistedOperationRouter,
    private readonly authorization: WorkbenchAuthorizationPort,
    private readonly observations: WorkbenchObservationPort,
    private readonly clock: Clock,
    private readonly uuidv7: UuidV7,
  ) {}

  async handle(
    context: TrustedConversationContext,
    input: WorkbenchInput,
  ): Promise<WorkbenchResponse> {
    if (context.source !== "trusted_runtime_context")
      return this.response(
        "untrusted",
        "failed",
        "無法驗證操作來源",
        true,
        false,
        "UNTRUSTED_CONTEXT",
      );
    if (
      !input.messageKey ||
      input.messageKey.length > 120 ||
      !input.text.trim() ||
      input.text.length > 2000
    )
      return this.response(
        "invalid",
        "failed",
        "輸入格式不正確",
        true,
        false,
        "INPUT_INVALID",
      );
    if (
      !(await this.authorization.hasPermission(
        context.tenantId,
        context.actorMembershipId,
        "conversation:use",
      ))
    )
      return this.response(
        "denied",
        "failed",
        "權限不足",
        true,
        false,
        "PERMISSION_DENIED",
      );
    const now = this.clock.now().getTime(),
      digest = await sha256Hex(
        canonicalJson({ text: input.text, slots: input.slots ?? {} }),
      );
    const contextReplay = await this.repository.findContextMessage(
      context.tenantId,
      context.applicationId,
      context.actorMembershipId,
      context.channelKey,
      input.messageKey,
    );
    if (contextReplay) {
      if (contextReplay.digest !== digest)
        return this.response(
          "conflict",
          "failed",
          "重送訊息內容不一致",
          false,
          false,
          "MESSAGE_CONFLICT",
        );
      return contextReplay.response;
    }
    let conversation = await this.repository.findActiveSession(
      context.tenantId,
      context.applicationId,
      context.actorMembershipId,
      context.channelKey,
      now,
    );
    if (!conversation) {
      conversation = {
        id: this.uuidv7.generate(),
        tenantId: context.tenantId,
        applicationId: context.applicationId,
        actorMembershipId: context.actorMembershipId,
        channelKey: context.channelKey,
        status: "active",
        activeIntentKey: null,
        currentStepKey: null,
        version: 1,
        expiresAt: now + SESSION_TTL,
      };
      await this.repository.createSession(conversation, now);
      await this.observe("conversation.started", context, "STARTED");
    }
    const replay = await this.repository.findMessage(
      context.tenantId,
      conversation.id,
      input.messageKey,
    );
    if (replay) {
      if (replay.digest !== digest)
        return this.response(
          conversation.id,
          "failed",
          "重送訊息內容不一致",
          false,
          false,
          "MESSAGE_CONFLICT",
        );
      return replay.response;
    }
    let response: WorkbenchResponse,
      intentKey: string | null = conversation.activeIntentKey;
    try {
      if (conversation.status === "waiting_for_confirmation") {
        response = await this.handleConfirmation(
          context,
          conversation,
          input,
          now,
        );
      } else {
        const resolution = await this.resolver.resolve(input.text);
        if (resolution.status === "security_rejected") {
          await this.observe(
            "conversation.security_rejected",
            context,
            resolution.reasonCode,
          );
          response = this.response(
            conversation.id,
            "failed",
            "此指令不在允許範圍內",
            false,
            false,
            resolution.reasonCode,
          );
        } else if (resolution.status === "ambiguous") {
          await this.observe(
            "conversation.clarification_required",
            context,
            resolution.reasonCode,
          );
          response = this.response(
            conversation.id,
            "clarification_required",
            "請選擇想執行的操作",
            true,
            false,
            resolution.reasonCode,
            resolution.choices,
          );
        } else if (
          resolution.status === "unsupported" &&
          !conversation.activeIntentKey
        ) {
          response = this.response(
            conversation.id,
            "failed",
            "無法辨識此需求",
            false,
            false,
            resolution.reasonCode,
          );
        } else {
          intentKey = resolution.intentKey ?? conversation.activeIntentKey;
          const intent = intentKey ? getIntent(intentKey) : null;
          if (!intent) throw new WorkbenchError("INTENT_NOT_ALLOWED");
          await this.observe(
            "conversation.intent_resolved",
            context,
            intent.intentKey,
          );
          response = await this.prepare(
            context,
            conversation,
            intent,
            input.slots ?? {},
            now,
          );
        }
      }
    } catch (error) {
      response = this.safeFailure(conversation.id, error);
      await this.observe(
        "conversation.operation_failed",
        context,
        this.errorCode(error),
      );
    }
    await this.repository.saveMessage({
      id: this.uuidv7.generate(),
      tenantId: context.tenantId,
      applicationId: context.applicationId,
      conversationId: conversation.id,
      messageKey: input.messageKey,
      messageDigest: digest,
      intentKey,
      response,
      createdAt: now,
    });
    return response;
  }

  private async prepare(
    context: TrustedConversationContext,
    conversation: ConversationSession,
    intent: IntentDefinition,
    incoming: Readonly<Record<string, unknown>>,
    now: number,
  ): Promise<WorkbenchResponse> {
    const existing = await this.repository.currentSlots(
        context.tenantId,
        conversation.id,
      ),
      collected = this.slots.collect(intent, existing, incoming);
    for (const [key, value] of Object.entries(collected.values))
      if (
        !(key in existing) ||
        canonicalJson(existing[key]) !== canonicalJson(value)
      ) {
        const definition = slotDefinitions[key];
        if (!definition) throw new WorkbenchError("INVALID_SLOT");
        await this.repository.saveSlot({
          id: this.uuidv7.generate(),
          tenantId: context.tenantId,
          applicationId: context.applicationId,
          conversationId: conversation.id,
          slotKey: key,
          slotType: definition.type,
          value,
          createdAt: now,
        });
      }
    if (collected.missing.length) {
      await this.repository.updateSession(
        conversation,
        {
          status: "waiting_for_input",
          activeIntentKey: intent.intentKey,
          currentStepKey: `slot:${collected.missing[0]}`,
          expiresAt: now + SESSION_TTL,
        },
        now,
      );
      return this.response(
        conversation.id,
        "action_required",
        missingSlotPrompt(collected.missing),
        true,
        false,
        "MISSING_SLOTS",
        collected.missing,
      );
    }
    const previous = await this.repository.latestOpenPlan(
      context.tenantId,
      conversation.id,
    );
    let planVersion = (previous?.planVersion ?? 0) + 1;
    const parameterDigest = await sha256Hex(canonicalJson(collected.values));
    if (
      previous &&
      previous.safeParameterDigest === parameterDigest &&
      previous.intentKey === intent.intentKey
    ) {
      if (previous.status === "awaiting_confirmation")
        return this.confirmationResponse(conversation.id, previous);
      const executed = await this.repository.executionResponse(
        context.tenantId,
        previous.id,
      );
      if (executed) return executed;
    }
    if (previous)
      await this.repository.transitionPlan(
        previous,
        "cancelled",
        "rejected",
        now,
      );
    const planId = this.uuidv7.generate(),
      confirmationRequired = intent.confirmationPolicy !== "none";
    const plan: OperationPlan = {
      id: planId,
      tenantId: context.tenantId,
      applicationId: context.applicationId,
      conversationId: conversation.id,
      planVersion,
      intentKey: intent.intentKey,
      intentVersion: intent.intentVersion,
      moduleKey: intent.moduleKey,
      operationKey: intent.operationKey,
      safeParameterDigest: parameterDigest,
      parameters: collected.values,
      riskLevel: intent.riskLevel,
      confirmationRequired,
      confirmationStatus: confirmationRequired ? "pending" : "not_required",
      accessSnapshotReference: await sha256Hex(
        `${context.tenantId}:${context.applicationId}:${context.actorMembershipId}:${intent.intentKey}:${planVersion}`,
      ),
      idempotencyKey: `workbench:${planId}`,
      status: confirmationRequired ? "awaiting_confirmation" : "prepared",
      version: 1,
      expiresAt: now + PLAN_TTL,
    };
    await this.repository.createPlan(plan, now);
    await this.observe(
      "conversation.operation_prepared",
      context,
      intent.intentKey,
    );
    if (confirmationRequired) {
      await this.repository.updateSession(
        conversation,
        {
          status: "waiting_for_confirmation",
          activeIntentKey: intent.intentKey,
          currentStepKey: `confirm:${plan.id}`,
          expiresAt: now + SESSION_TTL,
        },
        now,
      );
      await this.observe(
        "conversation.confirmation_requested",
        context,
        intent.intentKey,
      );
      return this.confirmationResponse(conversation.id, plan);
    }
    return this.execute(context, conversation, plan, intent, now);
  }

  private async handleConfirmation(
    context: TrustedConversationContext,
    conversation: ConversationSession,
    input: WorkbenchInput,
    now: number,
  ): Promise<WorkbenchResponse> {
    const plan = await this.repository.latestOpenPlan(
      context.tenantId,
      conversation.id,
    );
    if (!plan) throw new WorkbenchError("PLAN_STALE");
    const existing = await this.repository.executionResponse(
      context.tenantId,
      plan.id,
    );
    if (existing) return existing;
    if (plan.expiresAt <= now) {
      await this.repository.transitionPlan(plan, "expired", "rejected", now);
      throw new WorkbenchError("PLAN_EXPIRED");
    }
    const value = normalizeConfirmation(input.text);
    if (!confirmations.has(value) && !cancellations.has(value))
      return this.response(
        conversation.id,
        "confirmation_required",
        "請明確輸入「確認」或「取消」",
        true,
        false,
        "CONFIRMATION_AMBIGUOUS",
        ["確認", "取消"],
      );
    const approved = confirmations.has(value);
    await this.repository.saveConfirmation({
      id: this.uuidv7.generate(),
      tenantId: context.tenantId,
      applicationId: context.applicationId,
      planId: plan.id,
      actorMembershipId: context.actorMembershipId,
      planVersion: plan.planVersion,
      confirmationKey: input.messageKey,
      decision: approved ? "approved" : "rejected",
      createdAt: now,
    });
    if (!approved) {
      const cancelled = await this.repository.transitionPlan(
        plan,
        "cancelled",
        "rejected",
        now,
      );
      void cancelled;
      await this.repository.updateSession(
        conversation,
        {
          status: "cancelled",
          activeIntentKey: plan.intentKey,
          currentStepKey: null,
          expiresAt: conversation.expiresAt,
        },
        now,
      );
      await this.observe(
        "conversation.operation_cancelled",
        context,
        plan.intentKey,
      );
      return this.response(
        conversation.id,
        "cancelled",
        "操作已取消",
        false,
        false,
        "CANCELLED",
      );
    }
    const approvedPlan = await this.repository.transitionPlan(
        plan,
        "approved",
        "approved",
        now,
      ),
      intent = getIntent(plan.intentKey);
    if (!intent) throw new WorkbenchError("INTENT_NOT_ALLOWED");
    return this.execute(context, conversation, approvedPlan, intent, now);
  }

  private async execute(
    context: TrustedConversationContext,
    conversation: ConversationSession,
    plan: OperationPlan,
    intent: IntentDefinition,
    now: number,
  ): Promise<WorkbenchResponse> {
    const replay = await this.repository.executionResponse(
      context.tenantId,
      plan.id,
    );
    if (replay) return replay;
    if (plan.expiresAt <= now) throw new WorkbenchError("PLAN_EXPIRED");
    const executing = await this.repository.transitionPlan(
      plan,
      "executing",
      plan.confirmationStatus,
      now,
    );
    let response: WorkbenchResponse,
      status: "succeeded" | "failed" = "succeeded",
      supportCode: string | null = null;
    try {
      const result = await this.router.execute({
        context,
        plan: executing,
        intent,
      });
      response = {
        responseId: this.uuidv7.generate(),
        conversationId: conversation.id,
        status: "succeeded",
        message: result.message,
        supportCode: null,
        actionRequired: false,
        retryable: false,
        retryAfterSeconds: null,
        choices: [],
        summary: result.summary,
        operationReceipt: result.receipt,
        presentationPayload: {
          version: 1,
          status: "succeeded",
          summary: result.summary,
        },
      };
      await this.observe(
        "conversation.operation_succeeded",
        context,
        intent.intentKey,
      );
    } catch (error) {
      status = "failed";
      supportCode = `WB-${this.uuidv7.generate().replaceAll("-", "").slice(-10).toUpperCase()}`;
      response = this.safeFailure(conversation.id, error, supportCode);
      await this.observe(
        "conversation.operation_failed",
        context,
        this.errorCode(error),
      );
    }
    await this.repository.saveExecution({
      id: this.uuidv7.generate(),
      tenantId: context.tenantId,
      applicationId: context.applicationId,
      planId: plan.id,
      idempotencyKey: plan.idempotencyKey,
      status,
      response,
      supportCode,
      startedAt: now,
      completedAt: this.clock.now().getTime(),
    });
    await this.repository.transitionPlan(
      executing,
      status,
      status === "succeeded"
        ? executing.confirmationStatus
        : executing.confirmationStatus,
      this.clock.now().getTime(),
    );
    await this.repository.updateSession(
      conversation,
      {
        status: "completed",
        activeIntentKey: intent.intentKey,
        currentStepKey: null,
        expiresAt: conversation.expiresAt,
      },
      this.clock.now().getTime(),
    );
    return response;
  }

  private confirmationResponse(
    conversationId: string,
    plan: OperationPlan,
  ): WorkbenchResponse {
    return {
      responseId: this.uuidv7.generate(),
      conversationId,
      status: "confirmation_required",
      message: "請確認是否執行此操作",
      supportCode: null,
      actionRequired: true,
      retryable: false,
      retryAfterSeconds: null,
      choices: ["確認", "取消"],
      summary: {
        action: plan.operationKey,
        module: plan.moduleKey,
        parameters: plan.parameters,
        impact:
          plan.operationKey === "module.disable"
            ? "導航與服務將停用，資料保留"
            : "將執行已核准操作",
        reversible:
          plan.operationKey === "module.disable" ||
          plan.operationKey === "module.enable",
      },
      operationReceipt: plan.id,
      presentationPayload: {
        version: 1,
        status: "confirmation_required",
        planReference: plan.id,
      },
    };
  }
  private response(
    conversationId: string,
    status: WorkbenchResponse["status"],
    message: string,
    actionRequired: boolean,
    retryable: boolean,
    reasonCode: string,
    choices: readonly string[] = [],
  ): WorkbenchResponse {
    return {
      responseId: this.uuidv7.generate(),
      conversationId,
      status,
      message,
      supportCode: null,
      actionRequired,
      retryable,
      retryAfterSeconds: retryable ? 5 : null,
      choices,
      summary: { reasonCode },
      operationReceipt: null,
      presentationPayload: { version: 1, status, reasonCode },
    };
  }
  private safeFailure(
    conversationId: string,
    error: unknown,
    supportCode: string | null = null,
  ): WorkbenchResponse {
    const code = this.errorCode(error);
    const map: Record<string, string> = {
      PERMISSION_DENIED: "權限不足",
      CONVERSATION_PERMISSION_DENIED: "權限不足",
      MODULE_NOT_ENTITLED: "模組尚未授權",
      MODULE_NOT_ENABLED: "模組尚未啟用",
      MODULE_ENTITLEMENT_EXPIRED: "模組試用已到期",
      TRAFFIC_NOT_ADMITTED: "平台忙碌，請稍後再試",
      TRAFFIC_REJECTED: "平台忙碌，請稍後再試",
      STALE_MODULE_ACCESS: "模組狀態已變更，請重新操作",
      PLAN_STALE: "操作狀態已變更，請重新操作",
      PLAN_EXPIRED: "操作確認已過期",
      INVALID_SLOT: "輸入資料格式不正確",
      DIAGNOSTIC_NOT_FOUND: "找不到有效支援碼",
    };
    return {
      responseId: this.uuidv7.generate(),
      conversationId,
      status: "failed",
      message: map[code] ?? "系統暫時無法完成操作",
      supportCode,
      actionRequired: code === "INVALID_SLOT",
      retryable: [
        "TRAFFIC_NOT_ADMITTED",
        "TRAFFIC_REJECTED",
        "SERVICE_DEGRADED",
      ].includes(code),
      retryAfterSeconds: [
        "TRAFFIC_NOT_ADMITTED",
        "TRAFFIC_REJECTED",
        "SERVICE_DEGRADED",
      ].includes(code)
        ? 5
        : null,
      choices: [],
      summary: { reasonCode: code },
      operationReceipt: null,
      presentationPayload: { version: 1, status: "failed", reasonCode: code },
    };
  }
  private errorCode(error: unknown): string {
    return typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : error instanceof TypeError
        ? "INPUT_INVALID"
        : "PLATFORM_INTERNAL_ERROR";
  }
  private async observe(
    eventType: string,
    context: TrustedConversationContext,
    reasonCode: string,
  ): Promise<void> {
    try {
      await this.observations.record({
        eventType,
        tenantId: context.tenantId,
        applicationId: context.applicationId,
        operation: "conversational_workbench",
        reasonCode,
      });
    } catch {
      /* sidecar failure cannot alter the formal result */
    }
  }
}
