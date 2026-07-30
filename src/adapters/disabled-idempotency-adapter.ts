import { PersistenceUnavailableError } from "../core/errors";
import type {
  IdempotencyClaim,
  IdempotencyPort,
} from "../ports/idempotency-port";

export class DisabledIdempotencyAdapter implements IdempotencyPort {
  async claim(_intent: IdempotencyClaim): Promise<never> {
    throw new PersistenceUnavailableError("idempotency");
  }
}
