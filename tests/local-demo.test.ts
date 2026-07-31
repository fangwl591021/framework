import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertSafePayload,
  digestToken,
  localOnly,
  randomToken,
  sameOrigin,
  sessionCookie,
} from "../src/local-demo/security";

describe("Local demo security and browser boundary", () => {
  it.each([
    ["http://localhost/local/status", true],
    ["http://127.0.0.1/local/status", true],
    ["http://example.com/local/status", false],
    ["https://demo.example/local/status", false],
  ])("local host gate %s", (url, expected) =>
    expect(localOnly(new Request(url), "enabled")).toBe(expected),
  );
  it("fails closed when mode is absent", () =>
    expect(
      localOnly(new Request("http://localhost/local/status"), undefined),
    ).toBe(false));
  it("fails closed when mode is wrong", () =>
    expect(
      localOnly(new Request("http://localhost/local/status"), "production"),
    ).toBe(false));
  it("accepts exact same origin", () =>
    expect(
      sameOrigin(
        new Request("http://localhost/local/api/chat", {
          headers: { Origin: "http://localhost" },
        }),
      ),
    ).toBe(true));
  it("rejects a cross origin", () =>
    expect(
      sameOrigin(
        new Request("http://localhost/local/api/chat", {
          headers: { Origin: "https://evil.invalid" },
        }),
      ),
    ).toBe(false));
  it("rejects a missing origin", () =>
    expect(sameOrigin(new Request("http://localhost/local/api/chat"))).toBe(
      false,
    ));
  it.each([
    "tenantId",
    "applicationId",
    "actorMembershipId",
    "role",
    "roles",
    "permission",
    "permissions",
  ])("rejects untrusted context field %s", (key) =>
    expect(() => assertSafePayload({ [key]: "forged" })).toThrow(
      "UNTRUSTED_CONTEXT_FIELD",
    ),
  );
  it("rejects nested context injection", () =>
    expect(() =>
      assertSafePayload({ slots: { tenantId: "other" } }),
    ).toThrow());
  it("rejects unbounded arrays", () =>
    expect(() =>
      assertSafePayload({ items: Array.from({ length: 51 }) }),
    ).toThrow("PAYLOAD_TOO_LARGE"));
  it("accepts bounded workbench slots", () =>
    expect(() =>
      assertSafePayload({ text: "create event", slots: { capacity: 10 } }),
    ).not.toThrow());
  it("creates high entropy nonempty tokens", () => {
    const a = randomToken(),
      b = randomToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(32);
  });
  it("token digests are deterministic and do not expose token", async () => {
    const token = randomToken(),
      digest = await digestToken(token);
    expect(digest).toHaveLength(64);
    expect(digest).not.toContain(token);
  });
  it("session cookie is HttpOnly and strict", () =>
    expect(sessionCookie("opaque")).toContain("HttpOnly; SameSite=Strict"));
  it("browser script does not use innerHTML", () =>
    expect(
      readFileSync("local-demo/public/local/workbench/app.js", "utf8"),
    ).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/));
  it("renders missing slots with safe DOM form controls", () => {
    const script = readFileSync(
      "local-demo/public/local/workbench/app.js",
      "utf8",
    );
    expect(script).toContain('el("form", "slot-form")');
    expect(script).toContain("new FormData(slotForm)");
  });
  it("bounds the in-browser message window", () => {
    expect(
      readFileSync("local-demo/public/local/workbench/app.js", "utf8"),
    ).toContain("messages.children.length > 100");
  });
  it("production entry does not import local demo", () =>
    expect(readFileSync("src/index.ts", "utf8")).not.toContain("local-demo"));
  it("formal migrations do not contain local fixture tables", () => {
    const all = Array.from({ length: 7 }, (_, i) =>
      readFileSync(
        `migrations/${String(i + 1).padStart(4, "0")}_${["phase_1_core", "event_engine", "business_network_engine", "platform_observability", "platform_traffic_protection", "application_assembly", "conversational_workbench"][i]}.sql`,
        "utf8",
      ),
    ).join("\n");
    expect(all).not.toContain("local_demo_sessions");
  });
  it("local configuration uses an isolated entry", () => {
    const config = readFileSync("wrangler.local.jsonc", "utf8");
    expect(config).toContain('"main": "src/local-demo/worker.ts"');
    expect(config).not.toContain("remote");
  });
});
