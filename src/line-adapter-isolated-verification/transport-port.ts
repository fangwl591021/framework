import type { FakeLineTransportRequest, FakeLineTransportResult } from "./models";

export interface LineProviderTransportPort {
  readonly transportKey: "fake_line_transport";
  readonly localOnly: true;
  readonly networkAllowed: false;
  dispatch(
    request: FakeLineTransportRequest,
    control: Readonly<{ fakeTransportEnabled: boolean; killSwitch: boolean }>,
  ): Promise<FakeLineTransportResult>;
}
