import { describe,expect,it } from "vitest";
import { ChannelAdapterError, DisabledLineResponseRenderer, LocalWebResponseRenderer, localFixtureSignature, LocalDeterministicSignatureVerifier } from "../src/channel-adapter";
const capabilities={maxTextLength:12,maxMessages:1,supportsButtons:false,supportsCards:false,supportsReplyToken:false,supportsPush:false,supportsRichMenu:false,localeSupport:["zh-TW"]};
describe("Channel Adapter contracts",()=>{
  it("uses deterministic constant-time Web Crypto verification",async()=>{const body=new TextEncoder().encode('{"event":"x"}'),signature=await localFixtureSignature(body,1000);await expect(new LocalDeterministicSignatureVerifier().verify(body,signature,1000)).resolves.toBeUndefined();});
  it("rejects an altered raw body",async()=>{const body=new TextEncoder().encode("safe"),signature=await localFixtureSignature(body,1000);await expect(new LocalDeterministicSignatureVerifier().verify(new TextEncoder().encode("changed"),signature,1000)).rejects.toMatchObject({code:"CHANNEL_SIGNATURE_INVALID"});});
  it("bounds long responses deterministically",async()=>{const result=await new LocalWebResponseRenderer().render({type:"text",text:"12345678901234567890"},capabilities);expect(result).toMatchObject({truncated:true,messages:["12345678901…"],networkUsed:false});});
  it("falls cards back to text when unsupported",async()=>{const result=await new LocalWebResponseRenderer().render({type:"cards",text:"fallback",cards:[{title:"Card",body:"Body"}]},{...capabilities,maxTextLength:50});expect(result).toMatchObject({responseType:"text",messages:["Card: Body"]});});
  it.each(["<script>alert(1)</script>","<img onerror=alert(1)>","javascript:alert(1)"])("rejects unsafe markup %s",async(text)=>{await expect(new LocalWebResponseRenderer().render({type:"text",text},capabilities)).rejects.toBeInstanceOf(ChannelAdapterError);});
  it("keeps disabled renderers network-free and fail closed",async()=>{await expect(new DisabledLineResponseRenderer().render({type:"text",text:"x"},capabilities)).rejects.toMatchObject({code:"CHANNEL_ADAPTER_DISABLED"});});
});
