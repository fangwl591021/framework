import type { EventQrClaims, EventSharePayload } from "./models";

export interface EventShareAdapter {
  readonly adapterKey: string;
  buildTarget(payload: EventSharePayload): Promise<unknown>;
}

export interface EventQrKey {
  readonly version: number;
  readonly secret: Uint8Array;
}

export interface EventQrKeyProvider {
  current(): EventQrKey;
  resolve(version: number): EventQrKey | null;
}

export interface EventQrTokenPort {
  issue(claims: EventQrClaims): Promise<string>;
  verify(token: string, now: number): Promise<EventQrClaims>;
  digest(token: string): Promise<string>;
}

export interface EventNotificationAdapter {
  readonly adapterKey: string;
  dispatch(intentId: string): Promise<void>;
}
