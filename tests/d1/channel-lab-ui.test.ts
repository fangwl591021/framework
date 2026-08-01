import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../../src/local-demo/worker";
import { seedFixture } from "../../src/local-demo/seed";
import { channelLabScenarios } from "../../src/local-demo/channel-lab-service";
const migrations=env.TEST_MIGRATIONS as readonly D1Migration[];
const assets={fetch:async(request:Request)=>new Response(new URL(request.url).pathname.endsWith(".js")?"textContent":"<!doctype html><title>Local Channel Lab</title>",{headers:{"Content-Type":new URL(request.url).pathname.endsWith(".js")?"text/javascript":"text/html"}})};
const localEnv={LOCAL_DEMO_DB:env.DB,LOCAL_DEMO_MODE:"enabled",ASSETS:assets};
const req=(path:string,init:RequestInit={})=>new Request(`http://localhost${path}`,init);
let cookie="",csrf="";
async function session(fixtureKey="owner_a"){const response=await worker.fetch(req("/local/api/session",{method:"POST",headers:{Origin:"http://localhost","Content-Type":"application/json"},body:JSON.stringify({fixtureKey})}),localEnv);const data=await response.json() as {csrf:string};cookie=response.headers.get("Set-Cookie")?.split(";")[0]??"";csrf=data.csrf;return response;}
const get=(path:string,environment=localEnv)=>worker.fetch(req(path,{headers:cookie?{Cookie:cookie}:{}}),environment);
const post=(path:string,body:unknown,headers:Record<string,string>={})=>worker.fetch(req(path,{method:"POST",headers:{Origin:"http://localhost","Content-Type":"application/json",Cookie:cookie,"X-Local-CSRF":csrf,...headers},body:JSON.stringify(body)}),localEnv);
describe("Local Channel Lab UI",()=>{
  beforeAll(async()=>{await reset();await applyD1Migrations(env.DB,[...migrations]);for(const statement of env.LOCAL_DEMO_SCHEMA.split(";").map((v)=>v.trim()).filter(Boolean))await env.DB.prepare(statement).run();await seedFixture(env.DB);await session();});
  it.each([["/local/channel-lab","/local/channel-lab/"],["/local/channel-lab/events","/local/channel-lab/events/"],["/local/channel-lab/deliveries","/local/channel-lab/deliveries/"]] as const)("canonicalizes %s exactly once",async(path,target)=>{const first=await get(path);expect(first.status).toBe(307);expect(first.headers.get("Location")).toBe(`http://localhost${target}`);expect((await get(target)).status).toBe(200);});
  it("preserves query strings",async()=>expect((await get("/local/channel-lab?scenario=duplicate")).headers.get("Location")).toBe("http://localhost/local/channel-lab/?scenario=duplicate"));
  it("returns the four server-owned catalog entries and sixteen scenarios",async()=>{const data=await(await get("/local/api/channel-lab/catalog")).json() as any;expect(data.catalog).toHaveLength(4);expect(data.scenarios).toHaveLength(16);expect(data.banner).toBe("NO REAL CHANNEL CONNECTION");expect(data.catalog.filter((item:any)=>item.status!=="disabled").map((item:any)=>item.adapterKey)).toEqual(["local_web_adapter"]);});
  it.each(channelLabScenarios)("runs allowlisted local scenario %s without network",async(scenario)=>{const response=await post("/local/api/channel-lab/simulate",{scenario});expect(response.status).toBe(200);const data=await response.json() as any;expect(JSON.stringify(data)).toContain("NO REAL CHANNEL CONNECTION");expect(JSON.stringify(data)).not.toMatch(/access.?token|channel.?secret|raw.?webhook|authorization/i);});
  it("rejects an arbitrary scenario",async()=>expect((await post("/local/api/channel-lab/simulate",{scenario:"real-line-send"})).status).toBe(400));
  it("requires Same-Origin and CSRF",async()=>{const noCsrf=await worker.fetch(req("/local/api/channel-lab/simulate",{method:"POST",headers:{Origin:"http://localhost","Content-Type":"application/json",Cookie:cookie},body:'{"scenario":"valid_text_event"}'}),localEnv);expect(noCsrf.status).toBe(403);expect((await post("/local/api/channel-lab/simulate",{scenario:"valid_text_event"},{Origin:"https://evil.invalid"})).status).toBe(403);});
  it("denies the member fixture Channel Lab authority",async()=>{await session("member_a");expect((await get("/local/api/channel-lab/catalog")).status).toBe(403);expect((await post("/local/api/channel-lab/simulate",{scenario:"valid_text_event"})).status).toBe(403);await session("owner_a");});
  it("lists only safe tenant-scoped event and delivery evidence",async()=>{const events=await(await get("/local/api/channel-lab/events")).json() as any,deliveries=await(await get("/local/api/channel-lab/deliveries")).json() as any;expect(events.ok).toBe(true);expect(deliveries.ok).toBe(true);expect(JSON.stringify({events,deliveries})).not.toMatch(/local-user-a|private message|reply.?token|signature/i);});
  it("fails every page and API route closed outside local mode",async()=>{const outside={...localEnv,LOCAL_DEMO_MODE:"production"};expect((await get("/local/channel-lab/",outside)).status).toBe(404);expect((await get("/local/api/channel-lab/catalog",outside)).status).toBe(404);});
});

