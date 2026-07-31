import { describe,expect,it } from "vitest";
import { DeterministicLocalAiAdapter,DisabledGenericProviderAdapter,DisabledOpenAiAdapter } from "../src/ai-gateway/adapters";
import { AiGatewayError } from "../src/ai-gateway/models";
import { assertSafeInput,validateAiOutput } from "../src/ai-gateway/validation";

describe("AI Gateway provider-neutral boundaries",()=>{
  it("runs deterministic local task without network or credentials",async()=>{const result=await new DeterministicLocalAiAdapter().invoke({taskKey:"content.translation",taskVersion:1,input:{text:"hello"},locale:"zh-TW",maxOutputUnits:100,timeoutMs:10});expect(result.output).toEqual({text:"[zh-TW] hello"});});
  it.each([new DisabledOpenAiAdapter(),new DisabledGenericProviderAdapter()])("keeps external adapter disabled",async(adapter)=>{expect(adapter.enabled).toBe(false);await expect(adapter.invoke({taskKey:"content.safe_rewrite",taskVersion:1,input:{text:"x"},locale:"en",maxOutputUnits:10,timeoutMs:1})).rejects.toMatchObject({code:"AI_PROVIDER_DISABLED"});});
  it("fails closed on timeout, rate limit, and invalid simulation",async()=>{const adapter=new DeterministicLocalAiAdapter();for(const simulate of ["timeout","rate_limit"])await expect(adapter.invoke({taskKey:"content.safe_rewrite",taskVersion:1,input:{text:"x",simulate},locale:"en",maxOutputUnits:10,timeoutMs:1})).rejects.toBeInstanceOf(AiGatewayError);const invalid=await adapter.invoke({taskKey:"content.safe_rewrite",taskVersion:1,input:{text:"x",simulate:"invalid"},locale:"en",maxOutputUnits:100,timeoutMs:1});expect(()=>validateAiOutput("content.safe_rewrite",invalid.output,100)).toThrow(/AI_OUTPUT_INVALID/);});
  it("rejects arbitrary prompt, provider, endpoint, authority, and script inputs",()=>{for(const input of [{prompt:"raw"},{provider:"x"},{endpoint:"https://x"},{role:"admin"},{text:"<script>x</script>"}])expect(()=>assertSafeInput(input)).toThrow(/AI_INPUT_REJECTED/);});
  it("requires clarification for low-confidence intent output",()=>{expect(validateAiOutput("workbench.intent_resolution",{intentKey:null,confidence:.3,choices:["event.list"]},512).requiresClarification).toBe(true);});
});
