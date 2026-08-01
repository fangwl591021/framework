import { LineIsolatedVerificationError, type FakeLineTransportRecord, type FakeLineTransportRequest, type FakeLineTransportResult, type FakeLineTransportScenario } from "./models";
import type { LineProviderTransportPort } from "./transport-port";

const result = (value: Omit<FakeLineTransportResult, "networkUsed">): FakeLineTransportResult => Object.freeze({ ...value, networkUsed: false });

export class FakeLineTransport implements LineProviderTransportPort {
  readonly transportKey = "fake_line_transport" as const;
  readonly localOnly = true as const;
  readonly networkAllowed = false as const;
  private readonly recorded: FakeLineTransportRecord[] = [];

  constructor(private readonly scenario: FakeLineTransportScenario) {}

  records(): readonly FakeLineTransportRecord[] {
    return Object.freeze(this.recorded.map((item) => Object.freeze({ ...item })));
  }

  async dispatch(request: FakeLineTransportRequest, control: Readonly<{ fakeTransportEnabled: boolean; killSwitch: boolean }>): Promise<FakeLineTransportResult> {
    if (control.killSwitch) return result({ status: "kill_switch", retrySafe: false, retryAfterClass: "none", reasonCode: "LINE_KILL_SWITCH_ACTIVE" });
    if (!control.fakeTransportEnabled) return result({ status: "disabled", retrySafe: false, retryAfterClass: "none", reasonCode: "LINE_REAL_ADAPTER_DISABLED" });
    if (request.operation !== "reply" || !/^[A-Za-z0-9_.:-]{1,180}$/.test(request.eventKey) || typeof request.replyToken !== "string" || request.replyToken.length === 0 || request.replyToken.length > 255 || request.messages.length < 1 || request.messages.length > 5) {
      throw new LineIsolatedVerificationError("LINE_ISOLATED_TRANSPORT_INVALID");
    }
    const totalTextUnits = request.messages.reduce((total, message) => total + [...message.text].length, 0);
    if (request.messages.some((message) => message.type !== "text" || [...message.text].length > 5000) || totalTextUnits > 10_000) throw new LineIsolatedVerificationError("LINE_ISOLATED_TRANSPORT_INVALID");
    this.recorded.push(Object.freeze({ operation: "reply", eventKey: request.eventKey, messageCount: request.messages.length, totalTextUnits, networkUsed: false }));
    if (this.scenario === "success") return result({ status: "simulated_succeeded", retrySafe: false, retryAfterClass: "none", reasonCode: "LINE_FAKE_DISPATCH_SUCCEEDED" });
    if (this.scenario === "transient_failure") return result({ status: "transient_failure", retrySafe: false, retryAfterClass: "standard", reasonCode: "LINE_FAKE_PROVIDER_TRANSIENT" });
    if (this.scenario === "rate_limited") return result({ status: "rate_limited", retrySafe: false, retryAfterClass: "short", reasonCode: "LINE_FAKE_RATE_LIMITED" });
    return result({ status: "terminal_failure", retrySafe: false, retryAfterClass: "none", reasonCode: "LINE_FAKE_PROVIDER_PERMANENT" });
  }
}
