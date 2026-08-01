import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import { digestIdentitySubject, sha256Hex, type IdentityDigestKeyProvider } from "../persistence/crypto";
import { ChannelAdapterError, channelEventTypes, type ChannelEventType, type ChannelInboundEvent, type ChannelNeutralResponse, type ChannelProcessResult, type RenderedChannelResponse } from "./models";
import type { ChannelObservationPort, ChannelResponseRendererPort, ChannelSignatureVerifierPort, ChannelTrafficAdmissionPort, ChannelWorkbenchPort } from "./ports";
import { D1ChannelAdapterRepository } from "./repository";

const MAX_RAW_BYTES=16384, LEASE_MS=30000;
const decoder=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true});
const noReply:RenderedChannelResponse=Object.freeze({responseType:"no_reply",messages:Object.freeze([]),truncated:false,networkUsed:false});
export const channelPermissions=Object.freeze({catalogRead:"channel_catalog:read",accountRead:"channel_account:read",accountManage:"channel_account:manage",identityRead:"channel_identity:read",identityManage:"channel_identity:manage",eventRead:"channel_event:read",deliveryReadSelf:"channel_delivery:read_self",deliveryReadTenant:"channel_delivery:read_tenant",invoke:"channel_adapter:invoke",labRun:"channel_lab:run"});

export class ChannelAdapterApplication {
  readonly repository:D1ChannelAdapterRepository;
  private readonly verifiers:ReadonlyMap<string,ChannelSignatureVerifierPort>;
  private readonly renderers:ReadonlyMap<string,ChannelResponseRendererPort>;
  constructor(db:D1Database,private readonly clock:Clock,private readonly uuid:UuidV7,private readonly identityKeys:IdentityDigestKeyProvider,verifiers:readonly ChannelSignatureVerifierPort[],renderers:readonly ChannelResponseRendererPort[],private readonly traffic:ChannelTrafficAdmissionPort,private readonly workbench:ChannelWorkbenchPort,private readonly observation:ChannelObservationPort){
    this.repository=new D1ChannelAdapterRepository(db);this.verifiers=new Map(verifiers.map((item)=>[item.adapterKey,item]));this.renderers=new Map(renderers.map((item)=>[item.adapterKey,item]));
  }
  async process(input:Readonly<{channelAccountKey:string;rawBody:Uint8Array;signature:string|null;receivedAt?:number;clientContext?:unknown}>):Promise<ChannelProcessResult>{
    const started=input.receivedAt??this.clock.now().getTime();
    if(!input.channelAccountKey||input.channelAccountKey.length>100) throw new ChannelAdapterError("CHANNEL_ACCOUNT_NOT_FOUND");
    if(input.rawBody.byteLength<2||input.rawBody.byteLength>MAX_RAW_BYTES) throw new ChannelAdapterError("CHANNEL_PAYLOAD_TOO_LARGE");
    let account;
    try { account=await this.repository.getAccount(input.channelAccountKey); } catch { throw new ChannelAdapterError("CHANNEL_STORAGE_FAILED"); }
    if(!account) throw new ChannelAdapterError("CHANNEL_ACCOUNT_NOT_FOUND");
    const verifier=this.verifiers.get(account.adapterKey);
    if(!verifier||account.status!=="enabled_local_only") throw new ChannelAdapterError(account.status==="disabled"||account.adapterKey.startsWith("disabled_")?"CHANNEL_ADAPTER_DISABLED":"CHANNEL_ACCOUNT_DISABLED");
    try{await verifier.verify(input.rawBody,input.signature,started);}catch(error){await this.observe("channel.signature_rejected",account,"SIGNATURE_REJECTED",`CH-${this.uuid.generate().slice(0,12)}`);throw error;}
    const event=await this.normalize(input.rawBody,input.signature as string,account.channelType,account.channelAccountKey,started);
    const key=this.identityKeys.current();
    const identityDigest=event.externalUserReference?`v${key.version}:${await digestIdentitySubject(key,account.channelType,account.channelAccountKey,event.externalUserReference)}`:null;
    const conversationDigest=event.conversationReference?await sha256Hex(event.conversationReference):null;
    const leaseOwner=this.uuid.generate(),recordId=this.uuid.generate(),supportCode=`CH-${recordId.replaceAll("-","").slice(0,16).toUpperCase()}`;
    let claim;
    try{claim=await this.repository.claim(account,{eventId:event.eventId,externalEventId:event.externalEventId,eventType:event.eventType,occurredAt:event.occurredAt,receivedAt:event.receivedAt,payloadDigest:event.payloadDigest,signatureDigest:event.signatureDigest,deliveryAttempt:event.deliveryAttempt,externalUserReferenceDigest:identityDigest,conversationReferenceDigest:conversationDigest,metadataVersion:event.metadataVersion,payloadSize:input.rawBody.byteLength},recordId,leaseOwner,this.uuid.generate(),`channel:${recordId}`,LEASE_MS);}catch(error){if(error instanceof ChannelAdapterError)throw error;throw new ChannelAdapterError("CHANNEL_STORAGE_FAILED");}
    if(claim.disposition==="replay") return Object.freeze({...claim.result as ChannelProcessResult,status:"replayed"});
    if(claim.disposition==="processing") return Object.freeze({deliveryRecordId:claim.record.id,status:"processing",response:noReply,supportCode});
    await this.observe("channel.event_received",account,event.eventType,supportCode);
    let identityOutcome:"linked"|"not_linked"|"suspended"|"revoked"|"mismatch"|"not_required"="not_required";
    let workbenchOutcome="NOT_STARTED";
    let response:ChannelNeutralResponse;
    let finalStatus:"completed"|"rejected"="completed";
    if(event.eventType==="unsupported") {
      response=Object.freeze({type:"unsupported",text:"此通道事件目前不支援。",supportCode});
      workbenchOutcome="UNSUPPORTED_EVENT";
    } else if(!identityDigest) {
      identityOutcome="not_linked";
      response=Object.freeze({type:"error",text:"尚未連結可信身份。",supportCode});
      workbenchOutcome="IDENTITY_NOT_LINKED";
      finalStatus="rejected";
    } else {
      const identity=await this.repository.resolveIdentity(account,identityDigest);
      identityOutcome=identity.outcome;
      if(identity.outcome!=="linked"||!identity.tenantId||!identity.applicationId||!identity.membershipId||!identity.identityId){
        response=Object.freeze({type:"error",text:identity.outcome==="suspended"||identity.outcome==="revoked"?"此通道身份目前無法使用。":"尚未連結可信身份。",supportCode});
        workbenchOutcome=`IDENTITY_${identity.outcome.toUpperCase()}`;
        finalStatus="rejected";
        await this.observe("channel.identity_rejected",account,workbenchOutcome,supportCode);
      } else {
        await this.observe("channel.identity_resolved",account,"IDENTITY_LINKED",supportCode);
        const admission=await this.traffic.admit({tenantId:account.tenantId,applicationId:account.applicationId,channelAccountKey:account.channelAccountKey,externalIdentityDigest:identityDigest,eventType:event.eventType,correlationId:`channel:${claim.record.id}`});
        if(!admission.admitted){
          await admission.release();
          response=Object.freeze({type:"error",text:"目前流量繁忙，請稍後再試。",supportCode});
          workbenchOutcome="TRAFFIC_REJECTED";
          finalStatus="rejected";
        } else {
          try {
            await this.observe("channel.workbench_started",account,"WORKBENCH_STARTED",supportCode);
            response=await this.workbench.handle({source:"trusted_channel_context",tenantId:account.tenantId,applicationId:account.applicationId,membershipId:identity.membershipId,identityId:identity.identityId,channelAccountKey:account.channelAccountKey,channelType:account.channelType,correlationId:`channel:${claim.record.id}`},{messageKey:`channel:${account.channelAccountKey}:${event.externalEventId}`,text:event.text??"",locale:"zh-TW",capabilities:account.capabilities,idempotencyKey:`channel:${account.channelAccountKey}:${event.externalEventId}`});
            workbenchOutcome=response.type==="confirmation"?"CONFIRMATION_REQUIRED":"WORKBENCH_COMPLETED";
            await this.observe("channel.workbench_completed",account,workbenchOutcome,supportCode);
          } catch {
            response=Object.freeze({type:"error",text:"服務暫時無法完成，請稍後再試。",supportCode});
            workbenchOutcome="WORKBENCH_FAILED";
          } finally {
            try { await admission.release(); } catch { /* traffic adapter owns failure evidence */ }
          }
        }
      }
    }    const renderer=this.renderers.get(account.adapterKey);if(!renderer)throw new ChannelAdapterError("CHANNEL_ADAPTER_DISABLED");
    const rendered=await renderer.render(response,account.capabilities);
    const safeResult:ChannelProcessResult=Object.freeze({deliveryRecordId:claim.record.id,status:finalStatus,response:rendered,supportCode});
    await this.repository.complete({record:claim.record,leaseOwner,status:finalStatus,safeResult,resultDigest:await sha256Hex(JSON.stringify(safeResult)),identityOutcome,workbenchOutcome,responseType:rendered.responseType,inboundEventType:event.eventType,deliveryOutcome:finalStatus==="completed"?"completed":"rejected",latencyMs:Math.max(0,this.clock.now().getTime()-started),supportCode,evidenceId:this.uuid.generate(),auditId:this.uuid.generate(),correlationId:`channel:${claim.record.id}`,now:this.clock.now().getTime(),channelType:account.channelType});
    await this.observe("channel.delivery_completed",account,workbenchOutcome,supportCode);
    return safeResult;
  }
  private async normalize(raw:Uint8Array,signature:string,channelType:ChannelInboundEvent["channelType"],channelAccountKey:string,receivedAt:number):Promise<ChannelInboundEvent>{
    let value:unknown;try{value=JSON.parse(decoder.decode(raw));}catch{throw new ChannelAdapterError("CHANNEL_PAYLOAD_INVALID");}
    if(!value||typeof value!=="object"||Array.isArray(value))throw new ChannelAdapterError("CHANNEL_PAYLOAD_INVALID");
    const data=value as Record<string,unknown>,externalEventId=typeof data.externalEventId==="string"?data.externalEventId:"",rawType=typeof data.eventType==="string"?data.eventType:"unsupported";
    if(!externalEventId||externalEventId.length>160)throw new ChannelAdapterError("CHANNEL_PAYLOAD_INVALID");
    const eventType:ChannelEventType=(channelEventTypes as readonly string[]).includes(rawType)?rawType as ChannelEventType:"unsupported";
    const occurredAt=typeof data.occurredAt==="number"&&Number.isSafeInteger(data.occurredAt)&&data.occurredAt>=0&&data.occurredAt<=receivedAt?data.occurredAt:receivedAt;
    const text=typeof data.text==="string"&&data.text.length<=4000?data.text:null;
    const externalUserReference=typeof data.externalUserReference==="string"&&data.externalUserReference.length<=255?data.externalUserReference:null;
    const conversationReference=typeof data.conversationReference==="string"&&data.conversationReference.length<=255?data.conversationReference:null;
    const digest=await crypto.subtle.digest("SHA-256",raw);const payloadDigest=[...new Uint8Array(digest)].map((v)=>v.toString(16).padStart(2,"0")).join("");
    return Object.freeze({contractVersion:1,eventId:this.uuid.generate(),channelType,channelAccountKey,externalEventId,eventType,occurredAt,receivedAt,payloadDigest,signatureDigest:await sha256Hex(signature),deliveryAttempt:typeof data.deliveryAttempt==="number"&&Number.isInteger(data.deliveryAttempt)?Math.min(1000,Math.max(1,data.deliveryAttempt)):1,replyTokenReference:typeof data.replyTokenReference==="string"?data.replyTokenReference:null,externalUserReference,conversationReference,metadataVersion:1,text});
  }
  private async observe(eventType:string,account:{tenantId:string;applicationId:string;channelAccountKey:string},reasonCode:string,supportCode:string){try{await this.observation.record({eventType,tenantId:account.tenantId,applicationId:account.applicationId,channelAccountKey:account.channelAccountKey,reasonCode,supportCode});}catch{/* observability is a sidecar */}}
}
export class DisabledChannelObservationAdapter implements ChannelObservationPort {async record():Promise<void>{}}
export class LocalAllowChannelTraffic implements ChannelTrafficAdmissionPort {async admit(){return Object.freeze({admitted:true,release:async()=>{}});}}
