import type { IdentityDigestKeyProvider } from "../persistence/crypto";
import type { EventQrKeyProvider } from "../modules/event-engine";
const localFixtureBytes = (offset: number) =>
  Uint8Array.from({ length: 32 }, (_, index) => (index * 17 + offset) % 256);
export class LocalIdentityKeys implements IdentityDigestKeyProvider {
  current() {
    return { version: 1, secret: localFixtureBytes(11) };
  }
  previous() {
    return [];
  }
}
export class LocalQrKeys implements EventQrKeyProvider {
  private readonly key = { version: 1, secret: localFixtureBytes(29) };
  current() {
    return this.key;
  }
  resolve(version: number) {
    return version === 1 ? this.key : null;
  }
}
