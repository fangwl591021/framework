import { SystemClock } from "../core/clock";
import { UuidV7Generator } from "../core/uuidv7";
import { ChannelAdapterApplication, ChannelAdapterError, ChannelWorkbenchBridge, DisabledChannelObservationAdapter, DisabledGenericWebhookVerifier, DisabledLineResponseRenderer, DisabledLineSignatureVerifier, DisabledTelegramResponseRenderer, DisabledTelegramSignatureVerifier, LocalAllowChannelTraffic, LocalDeterministicSignatureVerifier, LocalWebResponseRenderer, localFixtureSignature, type ChannelNeutralResponse } from "../channel-adapter";
import type { WorkbenchInput, WorkbenchResponse } from "../conversational-workbench";
import type { DemoFixtureState } from "./seed";

export const channelLabScenarios=Object.freeze(["valid_text_event","invalid_signature","missing_signature","duplicate_replay","duplicate_conflict","stale_lease_completion","unknown_identity","suspended_identity","cross_tenant_identity_mismatch","unsupported_event","confirmation_required","confirmation_reply","workbench_failure","response_truncation","disabled_line_adapter","disabled_telegram_adapter"] as const);
export type ChannelLabScenario=(typeof channelLabScenarios)[number];
class LocalChannelAuthority {
  async handle(_context:unknown,input:WorkbenchInput):Promise<WorkbenchResponse>{
    if(input.text==="fixture:workbench-failure")throw new Error("LOCAL_WORKBENCH_FAILURE");
    const confirmation=input.text==="fixture:confirmation-required";
    const long=input.text==="fixture:long-response";
    return Object.freeze({responseId:"local-response",conversationId:"local-channel-conversation",status:confirmation?"confirmation_required":input.text==="確認"?"succeeded":"understood",message:long?"安全的本機回應。".repeat(200):confirmation?"請確認此動作。":input.text==="確認"?"已確認。":"已由 Workbench 處理。",supportCode:null,actionRequired:confirmation,retryable:false,retryAfterSeconds:null,choices:confirmation?["確認","取消"]:[],summary:null,operationReceipt:null,presentationPayload:{authority:"workbench"}});
  }
}
const encoder=new TextEncoder();
export class LocalChannelLabService {
  constructor(private readonly db:D1Database,private readonly fixture:DemoFixtureState){}
  private application(){return new ChannelAdapterApplication(this.db,new SystemClock(),new UuidV7Generator(),new (class {private readonly key={version:1,secret:new TextEncoder().encode("local-channel-identity-fixture-key")};current(){return this.key;}previous(){return [];}})(),[new LocalDeterministicSignatureVerifier(),new DisabledLineSignatureVerifier(),new DisabledTelegramSignatureVerifier(),new DisabledGenericWebhookVerifier()],[new LocalWebResponseRenderer(),new DisabledLineResponseRenderer(),new DisabledTelegramResponseRenderer()],new LocalAllowChannelTraffic(),new ChannelWorkbenchBridge(new LocalChannelAuthority()),new DisabledChannelObservationAdapter());}
  listScenarios(){return channelLabScenarios.map((scenario)=>Object.freeze({scenario,network:"disabled",secret:"fixture-only",productionAuthority:false}));}
  async catalog(){return this.application().repository.listCatalog();}
  async events(limit=50){return this.application().repository.listEvents(this.fixture.tenantA,limit);}
  async deliveries(limit=50){return this.application().repository.listDeliveries(this.fixture.tenantA,limit);}
  async event(id:string){if(!/^[0-9a-f-]{36}$/i.test(id))return null;const rows=await this.db.prepare("SELECT id,channel_account_key,external_event_id,event_type,received_at,payload_digest,metadata_version FROM channel_inbound_events WHERE tenant_id=?1 AND id=?2 LIMIT 1").bind(this.fixture.tenantA,id).all();return rows.results[0]??null;}
  async simulate(scenario:ChannelLabScenario){
    if(!channelLabScenarios.includes(scenario))throw new ChannelAdapterError("CHANNEL_PAYLOAD_INVALID");
    if(scenario==="cross_tenant_identity_mismatch")return {scenario,status:"rejected",code:"CHANNEL_IDENTITY_MISMATCH",banner:"NO REAL CHANNEL CONNECTION"};
    const now=Date.now(),externalEventId=`local-${scenario}-${now}`,base:{[key:string]:unknown}={externalEventId,eventType:"text_message",occurredAt:now,externalUserReference:"local-user-a",conversationReference:"local-channel-lab",deliveryAttempt:1,text:"list events"};
    if(scenario==="unknown_identity"||scenario==="suspended_identity")base.externalUserReference=scenario;
    if(scenario==="unsupported_event")base.eventType="future_event";
    if(scenario==="confirmation_required")base.text="fixture:confirmation-required";
    if(scenario==="confirmation_reply")base.text="確認";
    if(scenario==="workbench_failure")base.text="fixture:workbench-failure";
    if(scenario==="response_truncation")base.text="fixture:long-response";
    const body=encoder.encode(JSON.stringify(base));
    let signature:string|null=await localFixtureSignature(body,now),account=this.fixture.channelAccountKey;
    if(scenario==="missing_signature")signature=null;
    if(scenario==="invalid_signature")signature=`t=${now},v1=${"0".repeat(64)}`;
    if(scenario==="disabled_line_adapter")account="line-account-local-disabled";
    if(scenario==="disabled_telegram_adapter")account="telegram-account-local-disabled";
    const app=this.application();
    try {
      if(scenario==="duplicate_replay"){const first=await app.process({channelAccountKey:account,rawBody:body,signature,receivedAt:now});const replay=await app.process({channelAccountKey:account,rawBody:body,signature,receivedAt:now});return {scenario,first,replay,banner:"NO REAL CHANNEL CONNECTION"};}
      if(scenario==="duplicate_conflict"){await app.process({channelAccountKey:account,rawBody:body,signature,receivedAt:now});const conflictBody=encoder.encode(JSON.stringify({...base,text:"changed"}));const conflictSignature=await localFixtureSignature(conflictBody,now);try{await app.process({channelAccountKey:account,rawBody:conflictBody,signature:conflictSignature,receivedAt:now});}catch(error){return {scenario,status:"rejected",code:error instanceof ChannelAdapterError?error.code:"CHANNEL_EVENT_CONFLICT",banner:"NO REAL CHANNEL CONNECTION"};}}
      if(scenario==="stale_lease_completion")return {scenario,status:"rejected",code:"CHANNEL_STALE_COMPLETION",fencingRequired:true,banner:"NO REAL CHANNEL CONNECTION"};
      const result=await app.process({channelAccountKey:account,rawBody:body,signature,receivedAt:now});return {scenario,result,banner:"NO REAL CHANNEL CONNECTION"};
    } catch(error){return {scenario,status:"rejected",code:error instanceof ChannelAdapterError?error.code:"CHANNEL_SAFE_FAILURE",banner:"NO REAL CHANNEL CONNECTION"};}
  }
  async replay(externalEventId:string){if(!externalEventId||externalEventId.length>160)throw new ChannelAdapterError("CHANNEL_PAYLOAD_INVALID");const row=await this.db.prepare("SELECT safe_result_json FROM channel_delivery_records WHERE tenant_id=?1 AND channel_account_key=?2 AND external_event_id=?3 AND status IN ('completed','rejected') LIMIT 1").bind(this.fixture.tenantA,this.fixture.channelAccountKey,externalEventId).first<{safe_result_json:string}>();return row?JSON.parse(row.safe_result_json):null;}
  async reset(){const counts=await Promise.all([this.db.prepare("SELECT count(*) count FROM channel_inbound_events WHERE tenant_id=?1").bind(this.fixture.tenantA).first<{count:number}>(),this.db.prepare("SELECT count(*) count FROM channel_delivery_evidence WHERE tenant_id=?1").bind(this.fixture.tenantA).first<{count:number}>()]);return {reset:"session_only",immutableEventsRetained:counts[0]?.count??0,immutableEvidenceRetained:counts[1]?.count??0};}
}

