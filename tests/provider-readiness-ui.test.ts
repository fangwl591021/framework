import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Provider readiness Local UI security", () => {
  const script = readFileSync("local-demo/public/local/ai-lab/governance.js", "utf8");
  const readiness = readFileSync("local-demo/public/local/ai-lab/readiness/index.html", "utf8");
  const drills = readFileSync("local-demo/public/local/ai-lab/drills/index.html", "utf8");
  it("renders dynamic evidence through textContent", () => { expect(script).toContain("textContent"); expect(script).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/); });
  it("contains no provider or secret input control", () => { expect(readiness + drills).not.toMatch(/<input[^>]+(password|api.?key|secret|endpoint)/i); });
  it("marks both pages as not production approval", () => { expect(readiness).toContain("NOT PRODUCTION APPROVAL"); expect(drills).toContain("NOT PRODUCTION APPROVAL"); });
  it("uses only the fixed server drill list", () => { expect(script).not.toContain("contenteditable"); expect(script).toContain("item.drill"); });
  it("does not expose an external provider enable control", () => expect(readiness + drills + script).not.toMatch(/<button[^>]*>[^<]*(enable external|approve production)|<input[^>]+(provider|api.?key|endpoint)/i));
});
