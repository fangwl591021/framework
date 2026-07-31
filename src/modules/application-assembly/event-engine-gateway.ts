import type { MutationContext } from "../../application/core-services";
import {
  type EventEngineApplication,
  type CreateEventInput,
  type EventRecord,
} from "../event-engine";
import type {
  ApplicationAssemblyApplication,
  TrustedApplicationContext,
} from "./application";

export class EventEngineModuleGateway {
  constructor(
    private readonly assembly: ApplicationAssemblyApplication,
    private readonly eventEngine: EventEngineApplication,
  ) {}

  async assertAccess(
    context: TrustedApplicationContext,
    actorMembershipId: string,
  ): Promise<void> {
    await this.assembly.requireModuleAccess(
      context,
      actorMembershipId,
      "event-engine",
    );
  }

  async createEvent(
    context: TrustedApplicationContext,
    actorMembershipId: string,
    input: CreateEventInput,
    mutation: MutationContext,
  ): Promise<EventRecord> {
    await this.assertAccess(context, actorMembershipId);
    return this.eventEngine.createEvent(
      context.tenantId,
      actorMembershipId,
      input,
      mutation,
    );
  }
}
