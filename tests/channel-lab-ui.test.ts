import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
describe("Local Channel Lab static security",()=>{
  const script=readFileSync("local-demo/public/local/channel-lab/app.js","utf8"),pages=["local-demo/public/local/channel-lab/index.html","local-demo/public/local/channel-lab/events/index.html","local-demo/public/local/channel-lab/deliveries/index.html"].map((path)=>readFileSync(path,"utf8")).join("\n");
  it("renders dynamic output using textContent",()=>{expect(script+pages).toContain("textContent");expect(script+pages).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);});
  it("shows the explicit no-real-channel banner",()=>expect(pages).toContain("NO REAL CHANNEL CONNECTION"));
  it("provides no endpoint, token, secret or free-form Provider inputs",()=>expect(script+pages).not.toMatch(/<input|contenteditable|access.?token|channel.?secret|webhook.?url/i));
  it("contains the exact fixed scenario vocabulary",()=>{expect(script).toContain("duplicate_replay");expect(script).toContain("disabled_line_adapter");expect(script).toContain("disabled_telegram_adapter");});
});
