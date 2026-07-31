export interface BusinessNetworkModuleAccessPort {
  /**
   * The concrete Application composition binds this module instance to one
   * trusted Application context and rejects missing entitlement or enablement.
   */
  assertEnabled(tenantId: string, actorMembershipId: string): Promise<void>;
}
