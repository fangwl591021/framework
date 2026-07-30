import { TenantBoundaryError } from "../../persistence/models";
import { EventOperationsApplication } from "./event-operations-application";
import type { EventRosterEntry, EventStatistics } from "./models";

export class EventQueryApplication extends EventOperationsApplication {
  async listRoster(
    tenantId: string,
    actorMembershipId: string,
    eventId: string,
    limit = 100,
  ): Promise<readonly EventRosterEntry[]> {
    await this.requireEventPermission(tenantId, actorMembershipId, "roster");
    if (!await this.eventRepository.getEvent(tenantId, eventId)) {
      throw new TenantBoundaryError();
    }
    return this.eventRepository.listRoster(tenantId, eventId, limit);
  }

  async getStatistics(
    tenantId: string,
    actorMembershipId: string,
    eventId: string,
  ): Promise<EventStatistics> {
    await this.requireEventPermission(tenantId, actorMembershipId, "statistics");
    if (!await this.eventRepository.getEvent(tenantId, eventId)) {
      throw new TenantBoundaryError();
    }
    return this.eventRepository.getStatistics(tenantId, eventId);
  }
}
