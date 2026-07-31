import { describe,expect,it } from "vitest";
import { AiGatewayService } from "../src/ai-gateway/application";
import { createLocalAiProviderCatalog } from "../src/ai-gateway/adapters";
import type { AiGatewayRepository } from "../src/ai-gateway/repository";
import type { UuidV7 } from "../src/core/uuidv7";
const service=new AiGatewayService({} as AiGatewayRepository,{generate:()=>"019f0000-0000-7000-8000-000000000001"} as UuidV7,createLocalAiProviderCatalog(),{record:async()=>{}});
const local={providerKey:"deterministic_local_adapter",modelKey:"deterministic-fixture",modelVersion:"1"};
describe("AI routing and fallback",()=>{
 it("rejects cycles and more than two hops",()=>{expect(()=>service.selectRoute([local,local])).toThrow(/AI_POLICY_NOT_AVAILABLE/);expect(()=>service.selectRoute([local,{...local,modelVersion:"2"},{...local,modelVersion:"3"}])).toThrow(/AI_POLICY_NOT_AVAILABLE/);});
 it("skips disabled provider and deterministically falls back once",async()=>{const result=await service.invokeProvider([{providerKey:"disabled_openai_adapter",modelKey:"disabled",modelVersion:"1"},local],{taskKey:"content.safe_rewrite",taskVersion:1,input:{text:"safe"},locale:"en",maxOutputUnits:100,timeoutMs:10});expect(result.route).toEqual(local);expect(result.result.output).toEqual({text:"safe"});});
 it("fails closed when every approved hop is disabled",async()=>{await expect(service.invokeProvider([{providerKey:"disabled_openai_adapter",modelKey:"disabled",modelVersion:"1"},{providerKey:"disabled_generic_adapter",modelKey:"disabled",modelVersion:"1"}],{taskKey:"content.safe_rewrite",taskVersion:1,input:{text:"safe"},locale:"en",maxOutputUnits:100,timeoutMs:10})).rejects.toMatchObject({code:"AI_PROVIDER_FAILED"});});
});
