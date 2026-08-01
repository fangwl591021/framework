import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("local-demo/public/local/line-dashboard/index.html", "utf8");
const script = readFileSync("local-demo/public/local/line-dashboard/app.js", "utf8");
const data = readFileSync("local-demo/public/local/line-dashboard/data.js", "utf8");
const navigation = [
  "local-demo/public/local/workbench/index.html",
  "local-demo/public/local/ai-lab/index.html",
  "local-demo/public/local/channel-lab/index.html",
].map((path) => readFileSync(path, "utf8")).join("\n");

describe("LINE Platform Dashboard", () => {
  it("adds the LINE Platform navigation entry", () => {
    expect(navigation).toContain('href="/local/line-dashboard/"');
    expect(navigation).toContain("LINE Platform");
  });

  it("renders the requested delivery-facing status vocabulary", () => {
    expect(data).toContain('label: "Live Worker", value: "Online"');
    expect(data).toContain('label: "Binding", value: "oa-primary"');
    expect(data).toContain('label: "Webhook Verification", value: "Passed"');
    expect(data).toContain('label: "Real Message Reply", value: "Passed"');
    expect(data).toContain('label: "Platform Scope", value: "First OA Binding"');
  });

  it("models bindings as an immutable collection ready for multiple records", () => {
    expect(data).toContain("bindings: Object.freeze([");
    expect(data).toContain('bindingKey: "oa-primary"');
    expect(data).toContain('credentialStorage: "Cloudflare Secrets"');
    expect(script).toContain("for (const binding of data.bindings)");
  });

  it("shows the platform authority hierarchy", () => {
    expect(data).toContain('["Tenant", "Application", "Channel Binding", "LINE OA"]');
    expect(html).toContain('aria-label="Tenant to LINE OA hierarchy"');
  });

  it("contains completed, limitation, usage, and security content", () => {
    for (const phrase of [
      "Real webhook connectivity",
      "Arbitrary OA onboarding",
      "Open LINE OA",
      "Secrets never displayed",
      "Unknown binding fails closed",
      "Invalid signature rejected",
      "No retry for reply token",
    ]) expect(data).toContain(phrase);
  });

  it("uses exact destinations without a browser request", () => {
    expect(data).toContain("https://platform-core-line-sandbox-live.fangwl591021.workers.dev/webhook/oa-primary");
    expect(data).toContain("https://platform-core-line-sandbox-live.fangwl591021.workers.dev/health");
    expect(script).not.toContain("fetch(");
  });

  it("renders dynamic values through safe DOM text APIs", () => {
    expect(script).toContain("textContent");
    expect(script).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);
  });

  it("does not contain credential, identity, or webhook payload values", () => {
    expect(html + script + data).not.toMatch(/channel.?secret\s*[:=]|access.?token\s*[:=]|replyToken|userId|raw.?webhook.?body|authorization:\s*bearer/i);
  });
});
