import { PersistenceUnavailableError } from "../core/errors";
import type { AuditIntent, AuditPort } from "../ports/audit-port";

export class DisabledAuditAdapter implements AuditPort {
  async record(_intent: AuditIntent): Promise<void> {
    throw new PersistenceUnavailableError("audit");
  }
}
