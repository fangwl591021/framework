import type { MutationContext } from "../application/core-services";
import type {
  ApplicationModuleServiceGateway,
  CatalogModule,
  TenantManager,
} from "../application-assembly";
import type {
  EventRecord,
  EventSession,
  EventStatistics,
} from "../modules/event-engine";
import type {
  CreateEventInput,
  CreateEventSessionInput,
} from "../modules/event-engine/models";
import type {
  BusinessRelationship,
  CommissionRecord,
  PerformanceSummary,
} from "../modules/business-network";
import type {
  DiagnosticAccessContext,
  ObservationEvent,
  Page,
} from "../platform-observability";
import type { SupportCodeDiagnostic } from "../platform-observability/repository";
import type { OperationInvocation, OperationResult } from "./models";
import type {
  PlatformServiceInvocationPort,
  WorkbenchOperationAdapter,
} from "./ports";

const mutation = (invocation: OperationInvocation): MutationContext => ({
  idempotencyKey: invocation.plan.idempotencyKey,
  actorType: "platform_user",
  actorReference: invocation.context.actorMembershipId,
  correlationId: invocation.context.correlationId,
});
const number = (value: unknown, fallback: number) =>
  typeof value === "number" ? value : fallback;

export interface EventWorkbenchServicePort {
  createEventWithSession(
    tenantId: string,
    actorMembershipId: string,
    eventInput: CreateEventInput,
    sessionInput: CreateEventSessionInput,
    context: MutationContext,
  ): Promise<{ event: EventRecord; session: EventSession }>;
  cancelEvent(
    tenantId: string,
    actorMembershipId: string,
    eventId: string,
    notificationAdapter: string,
    context: MutationContext,
  ): Promise<EventRecord>;
  getStatistics(
    tenantId: string,
    actorMembershipId: string,
    eventId: string,
  ): Promise<EventStatistics>;
  listEvents(
    tenantId: string,
    actorMembershipId: string,
    limit?: number,
  ): Promise<readonly EventRecord[]>;
}

export class EventWorkbenchAdapter implements WorkbenchOperationAdapter {
  readonly moduleKey = "event_engine";
  readonly operations = [
    "event.create",
    "event.registration_summary",
    "event.list",
    "event.cancel",
  ] as const;
  constructor(
    private readonly gateway: ApplicationModuleServiceGateway,
    private readonly events: EventWorkbenchServicePort,
  ) {}
  invoke(invocation: OperationInvocation): Promise<OperationResult> {
    const common = {
      source: "trusted_runtime_context" as const,
      tenantId: invocation.context.tenantId,
      applicationId: invocation.context.applicationId,
      actorMembershipId: invocation.context.actorMembershipId,
      requiredPermission: invocation.intent.requiredPermission,
      operation: invocation.intent.operationKey,
      correlationId: invocation.context.correlationId,
    };
    const p = invocation.plan.parameters;
    if (invocation.plan.operationKey === "event.create")
      return this.gateway.invokeEventMutation(common, async () => {
        const start = number(p.start_time, 0),
          end = number(p.end_time, 0),
          title = String(p.activity_name);
        const { event } = await this.events.createEventWithSession(
          common.tenantId,
          common.actorMembershipId,
          {
            title,
            description: p.location ? `Location: ${String(p.location)}` : "",
            registrationOpensAt: Math.max(0, start - 30 * 24 * 60 * 60 * 1000),
            registrationClosesAt: start,
            paymentMode: "free",
          },
          {
            title,
            startsAt: start,
            endsAt: end,
            capacity: number(p.capacity, 0),
            waitlistCapacity: 0,
          },
          mutation(invocation),
        );
        return {
          message: "活動已建立",
          receipt: event.id,
          summary: { eventReference: event.id, title: event.title },
        };
      });
    if (invocation.plan.operationKey === "event.cancel")
      return this.gateway.invokeEventMutation(common, async () => {
        const event = await this.events.cancelEvent(
          common.tenantId,
          common.actorMembershipId,
          String(p.event_reference),
          "disabled",
          mutation(invocation),
        );
        return {
          message: "活動已取消",
          receipt: event.id,
          summary: { eventReference: event.id, status: event.status },
        };
      });
    if (invocation.plan.operationKey === "event.registration_summary")
      return this.gateway.invokeEventQuery(common, async () => {
        const s = await this.events.getStatistics(
          common.tenantId,
          common.actorMembershipId,
          String(p.event_reference),
        );
        return {
          message: "活動報名摘要",
          receipt: s.eventId,
          summary: {
            eventReference: s.eventId,
            confirmed: s.confirmed,
            waitlisted: s.waitlisted,
            cancelled: s.cancelled,
            checkedIn: s.checkedIn,
          },
        };
      });
    return this.gateway.invokeEventQuery(common, async () => {
      const items = await this.events.listEvents(
        common.tenantId,
        common.actorMembershipId,
        20,
      );
      return {
        message: "活動列表",
        receipt: `events:${items.length}`,
        summary: {
          items: items
            .map((event) => ({
              eventReference: event.id,
              title: event.title,
              status: event.status,
            }))
            .slice(0, 20),
        },
      };
    });
  }
}

export interface BusinessNetworkWorkbenchServicePort {
  getMyCommission(
    tenantId: string,
    membershipId: string,
    from?: number,
    until?: number,
    limit?: number,
  ): Promise<readonly CommissionRecord[]>;
  getMyPerformance(
    tenantId: string,
    membershipId: string,
    from: number,
    until: number,
  ): Promise<PerformanceSummary>;
  getMyReferrals(
    tenantId: string,
    membershipId: string,
    from?: number,
    until?: number,
    limit?: number,
  ): Promise<readonly BusinessRelationship[]>;
}
export class BusinessNetworkWorkbenchAdapter
  implements WorkbenchOperationAdapter
{
  readonly moduleKey = "business_network_engine";
  readonly operations = [
    "network.my_commission",
    "network.my_performance",
    "network.my_referrals",
  ] as const;
  constructor(
    private readonly gateway: ApplicationModuleServiceGateway,
    private readonly network: BusinessNetworkWorkbenchServicePort,
    private readonly now: () => number = Date.now,
  ) {}
  invoke(invocation: OperationInvocation): Promise<OperationResult> {
    const common = {
      source: "trusted_runtime_context" as const,
      tenantId: invocation.context.tenantId,
      applicationId: invocation.context.applicationId,
      actorMembershipId: invocation.context.actorMembershipId,
      requiredPermission: invocation.intent.requiredPermission,
      operation: invocation.intent.operationKey,
      correlationId: invocation.context.correlationId,
    };
    const p = invocation.plan.parameters,
      until = number(p.until, this.now()),
      from = number(p.from, until - 30 * 24 * 60 * 60 * 1000);
    return this.gateway.invokeBusinessNetworkQuery(common, async () => {
      if (invocation.plan.operationKey === "network.my_commission") {
        const rows = await this.network.getMyCommission(
          common.tenantId,
          common.actorMembershipId,
          from,
          until,
          50,
        );
        return {
          message: "佣金摘要",
          receipt: `commission:${rows.length}`,
          summary: {
            period: { from, until },
            count: rows.length,
            total: rows.reduce((sum, row) => sum + row.commissionAmount, 0),
            currency: rows[0]?.currency ?? null,
          },
        };
      }
      if (invocation.plan.operationKey === "network.my_performance") {
        const value = await this.network.getMyPerformance(
          common.tenantId,
          common.actorMembershipId,
          from,
          until,
        );
        return {
          message: "推薦業績摘要",
          receipt: "performance",
          summary: { period: { from, until }, ...value },
        };
      }
      const rows = await this.network.getMyReferrals(
        common.tenantId,
        common.actorMembershipId,
        from,
        until,
        Math.min(50, number(p.limit, 20)),
      );
      return {
        message: "推薦摘要",
        receipt: `referrals:${rows.length}`,
        summary: {
          count: rows.length,
          items: rows
            .map((row) => ({
              relationshipReference: row.id,
              type: row.relationshipType,
              status: row.status,
            }))
            .slice(0, 50),
        },
      };
    });
  }
}

export interface ApplicationAssemblyWorkbenchServicePort {
  listAvailableModules(
    tenantId: string,
    applicationId: string,
    membershipId: string,
  ): Promise<readonly CatalogModule[]>;
  enableModule(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    actor: TenantManager,
    context: MutationContext,
  ): Promise<unknown>;
  disableModule(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    actor: TenantManager,
    context: MutationContext,
  ): Promise<unknown>;
}
export class ApplicationAssemblyWorkbenchAdapter
  implements WorkbenchOperationAdapter
{
  readonly moduleKey = "application_assembly";
  readonly operations = [
    "module.list_available",
    "module.enable",
    "module.disable",
  ] as const;
  constructor(
    private readonly boundary: PlatformServiceInvocationPort,
    private readonly assembly: ApplicationAssemblyWorkbenchServicePort,
  ) {}
  invoke(invocation: OperationInvocation): Promise<OperationResult> {
    return this.boundary.invoke(
      invocation.context,
      invocation.intent,
      async () => {
        const p = invocation.plan.parameters;
        if (invocation.plan.operationKey === "module.list_available") {
          const rows = await this.assembly.listAvailableModules(
            invocation.context.tenantId,
            invocation.context.applicationId,
            invocation.context.actorMembershipId,
          );
          return {
            message: "目前可使用的功能",
            receipt: `modules:${rows.length}`,
            summary: {
              items: rows
                .map((row) => ({
                  moduleKey: row.moduleKey,
                  name: row.displayName,
                  status: row.availabilityStatus,
                }))
                .slice(0, 50),
            },
          };
        }
        const moduleKey = String(p.module_reference),
          actor = { membershipId: invocation.context.actorMembershipId };
        if (invocation.plan.operationKey === "module.enable")
          await this.assembly.enableModule(
            invocation.context.tenantId,
            invocation.context.applicationId,
            moduleKey,
            actor,
            mutation(invocation),
          );
        else
          await this.assembly.disableModule(
            invocation.context.tenantId,
            invocation.context.applicationId,
            moduleKey,
            actor,
            mutation(invocation),
          );
        return {
          message:
            invocation.plan.operationKey === "module.enable"
              ? "模組已啟用"
              : "模組已停用",
          receipt: `${moduleKey}:${invocation.plan.operationKey}`,
          summary: {
            moduleKey,
            dataRetained: true,
            navigationVisible: invocation.plan.operationKey === "module.enable",
          },
        };
      },
    );
  }
}

export interface DiagnosticsWorkbenchServicePort {
  listTenantDiagnostics(
    tenantId: string,
    access: DiagnosticAccessContext,
    page?: { limit?: number },
  ): Promise<Page<ObservationEvent>>;
  getDiagnosticBySupportCode(
    supportCode: string,
    access: DiagnosticAccessContext,
  ): Promise<SupportCodeDiagnostic>;
}
export class DiagnosticsWorkbenchAdapter implements WorkbenchOperationAdapter {
  readonly moduleKey = "platform_observability";
  readonly operations = [
    "diagnostics.today_summary",
    "diagnostics.lookup_support_code",
  ] as const;
  constructor(
    private readonly boundary: PlatformServiceInvocationPort,
    private readonly diagnostics: DiagnosticsWorkbenchServicePort,
    private readonly now: () => number = Date.now,
  ) {}
  invoke(invocation: OperationInvocation): Promise<OperationResult> {
    return this.boundary.invoke(
      invocation.context,
      invocation.intent,
      async () => {
        const access: DiagnosticAccessContext = {
          tenantId: invocation.context.tenantId,
          membershipId: invocation.context.actorMembershipId,
          permissionKeys: [invocation.intent.requiredPermission],
        };
        if (
          invocation.plan.operationKey === "diagnostics.lookup_support_code"
        ) {
          const d = await this.diagnostics.getDiagnosticBySupportCode(
            String(invocation.plan.parameters.support_code),
            access,
          );
          return {
            message: "支援碼診斷摘要",
            receipt: d.supportCode,
            summary: {
              supportCode: d.supportCode,
              status: d.observation.status,
              severity: d.observation.severity,
              reasonCode: d.observation.reasonCode,
              eventTime: d.observation.timestamp,
            },
          };
        }
        const page = await this.diagnostics.listTenantDiagnostics(
          invocation.context.tenantId,
          access,
          { limit: 50 },
        );
        const since = this.now() - 24 * 60 * 60 * 1000,
          items = page.items.filter((item) => item.timestamp >= since);
        return {
          message: "今日系統異常摘要",
          receipt: `diagnostics:${items.length}`,
          summary: {
            count: items.length,
            items: items.slice(0, 20).map((item) => ({
              status: item.status,
              severity: item.severity,
              reasonCode: item.reasonCode,
              eventTime: item.timestamp,
            })),
          },
        };
      },
    );
  }
}
