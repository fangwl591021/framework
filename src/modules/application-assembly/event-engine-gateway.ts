import type { EventEngineApplication } from "../event-engine";
import type {
  ApplicationAssemblyApplication,
  TrustedApplicationContext,
} from "./application";

export class EventEngineModuleGateway {
  constructor(
    private readonly assembly: ApplicationAssemblyApplication,
    private readonly eventEngine: EventEngineApplication,
  ) {}

  async execute<T>(
    context: TrustedApplicationContext,
    actorMembershipId: string,
    operation: (eventEngine: EventEngineApplication) => Promise<T>,
  ): Promise<T> {
    await this.assembly.requireModuleAccess(
      context,
      actorMembershipId,
      "event-engine",
    );
    return operation(this.eventEngine);
  }
}
