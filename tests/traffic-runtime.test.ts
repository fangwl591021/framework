import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { NoopRuntimeLogger } from "../src/core/logger";
import { LocalLoadShedding, LocalTrafficReadinessAdapter } from "../src/platform-traffic";
import { createHealthHandler } from "../src/runtime/health";
import { createReadinessHandler } from "../src/runtime/readiness";
import { Router } from "../src/runtime/router";
import { FixedClock, SequenceUuidV7 } from "./helpers";

const checks={router:true,requestContext:true,uuidv7:true,moduleBoundaries:true,reliabilityFoundation:true} as const;
function runtime(mode:"normal"|"emergency"){
 const clock=new FixedClock();
 const shedding=new LocalLoadShedding(()=>clock.now().getTime(),{recoveryHysteresisMs:1000});
 if(mode==="emergency")shedding.activate("emergency");
 const router=new Router();
 router.register({method:"GET",path:"/health",handler:createHealthHandler(clock)});
 router.register({method:"GET",path:"/ready",handler:createReadinessHandler(clock,checks,undefined,new LocalTrafficReadinessAdapter(shedding))});
 return createApp({router,clock,uuidv7:new SequenceUuidV7(),logger:new NoopRuntimeLogger()});
}

describe("Traffic protection operational endpoints",()=>{
 it("keeps health available during emergency degradation",async()=>expect((await runtime("emergency").fetch(new Request("https://runtime.test/health"))).status).toBe(200));
 it("fails readiness closed during emergency degradation",async()=>expect((await runtime("emergency").fetch(new Request("https://runtime.test/ready"))).status).toBe(503));
 it("reports ready in normal mode",async()=>expect((await runtime("normal").fetch(new Request("https://runtime.test/ready"))).status).toBe(200));
});