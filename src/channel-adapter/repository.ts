import { ChannelAdapterError, type ChannelAccount, type ChannelCapabilities, type ChannelEventType, type ChannelProcessResult } from "./models";

type AccountRow = { channel_account_key:string; channel_type:ChannelAccount["channelType"]; tenant_id:string; application_id:string; adapter_key:string; status:ChannelAccount["status"]; signature_policy_version:number; response_policy_version:number; secret_reference:string|null; version:number; capabilities_json:string };
type DeliveryRow = { id:string; tenant_id:string; application_id:string; channel_account_key:string; inbound_event_id:string; external_event_id:string; payload_digest:string; status:"received"|"processing"|"completed"|"rejected"|"failed"|"expired"; lease_owner:string|null; fencing_token:number; lease_expires_at:number|null; attempt_count:number; safe_result_json:string|null; version:number };
export interface ChannelIdentityResolution { readonly outcome:"linked"|"not_linked"|"suspended"|"revoked"|"mismatch"; readonly tenantId:string|null; readonly applicationId:string|null; readonly identityId:string|null; readonly membershipId:string|null; }
export interface DeliveryClaim { readonly disposition:"execute"|"replay"|"processing"; readonly record:DeliveryRow; readonly result:ChannelProcessResult|null; }
export interface PersistedInbound {
  readonly eventId:string; readonly externalEventId:string; readonly eventType:ChannelEventType;
  readonly occurredAt:number; readonly receivedAt:number; readonly payloadDigest:string; readonly signatureDigest:string;
  readonly deliveryAttempt:number; readonly externalUserReferenceDigest:string|null; readonly conversationReferenceDigest:string|null;
  readonly metadataVersion:number; readonly payloadSize:number;
}
const DELIVERY_SELECT = `SELECT id,tenant_id,application_id,channel_account_key,inbound_event_id,external_event_id,payload_digest,status,lease_owner,fencing_token,lease_expires_at,attempt_count,safe_result_json,version FROM channel_delivery_records`;
const bounded = (limit:number) => Math.min(100, Math.max(1, Math.trunc(limit)));

export class D1ChannelAdapterRepository {
  constructor(private readonly db:D1Database) {}
  async getAccount(channelAccountKey:string):Promise<(ChannelAccount & { capabilities:ChannelCapabilities })|null> {
    const row = await this.db.prepare(`SELECT a.channel_account_key,a.channel_type,a.tenant_id,a.application_id,a.adapter_key,a.status,a.signature_policy_version,a.response_policy_version,a.secret_reference,a.version,c.capabilities_json FROM channel_accounts a JOIN channel_catalog c ON c.adapter_key=a.adapter_key WHERE a.channel_account_key=?1 LIMIT 1`).bind(channelAccountKey).first<AccountRow>();
    return row ? Object.freeze({ channelAccountKey:row.channel_account_key, channelType:row.channel_type, tenantId:row.tenant_id, applicationId:row.application_id, adapterKey:row.adapter_key, status:row.status, signaturePolicyVersion:row.signature_policy_version, responsePolicyVersion:row.response_policy_version, secretReference:row.secret_reference, version:row.version, capabilities:Object.freeze(JSON.parse(row.capabilities_json) as ChannelCapabilities) }) : null;
  }
  async listCatalog() {
    const rows = await this.db.prepare(`SELECT adapter_key,channel_type,display_name,status,local_only,capabilities_json,version FROM channel_catalog ORDER BY adapter_key LIMIT 20`).all<{adapter_key:string;channel_type:string;display_name:string;status:string;local_only:number;capabilities_json:string;version:number}>();
    return Object.freeze(rows.results.map((row)=>Object.freeze({adapterKey:row.adapter_key,channelType:row.channel_type,displayName:row.display_name,status:row.status,localOnly:row.local_only===1,capabilities:JSON.parse(row.capabilities_json),version:row.version})));
  }
  async claim(account:ChannelAccount, inbound:PersistedInbound, recordId:string, leaseOwner:string, auditId:string, correlationId:string, leaseMs:number):Promise<DeliveryClaim> {
    const existing = await this.findDelivery(account.channelAccountKey,inbound.externalEventId);
    if (existing) return this.reclaim(existing,inbound.payloadDigest,leaseOwner,inbound.receivedAt,leaseMs);
    try {
      await this.db.batch([
        this.db.prepare(`INSERT INTO channel_inbound_events(id,tenant_id,application_id,channel_account_key,external_event_id,event_type,occurred_at,received_at,payload_digest,signature_digest,delivery_attempt,external_user_reference_digest,conversation_reference_digest,metadata_version,payload_size,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?8)`).bind(inbound.eventId,account.tenantId,account.applicationId,account.channelAccountKey,inbound.externalEventId,inbound.eventType,inbound.occurredAt,inbound.receivedAt,inbound.payloadDigest,inbound.signatureDigest,inbound.deliveryAttempt,inbound.externalUserReferenceDigest,inbound.conversationReferenceDigest,inbound.metadataVersion,inbound.payloadSize),
        this.db.prepare(`INSERT INTO channel_delivery_records(id,tenant_id,application_id,channel_account_key,inbound_event_id,external_event_id,payload_digest,status,lease_owner,fencing_token,lease_expires_at,first_received_at,last_received_at,attempt_count,completed_at,result_digest,safe_result_json,failure_code,version,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,'processing',?8,1,?9,?10,?10,1,NULL,NULL,NULL,NULL,1,?10,?10)`).bind(recordId,account.tenantId,account.applicationId,account.channelAccountKey,inbound.eventId,inbound.externalEventId,inbound.payloadDigest,leaseOwner,inbound.receivedAt+leaseMs,inbound.receivedAt),
        this.db.prepare(`INSERT INTO audit_records(id,scope_type,tenant_id,actor_type,actor_reference,action,resource_type,resource_reference,decision,reason_code,correlation_reference,occurred_at,created_at) VALUES(?1,'tenant',?2,'service','channel-adapter','channel.delivery.claim','channel_delivery_record',?3,'changed','CHANNEL_DELIVERY_CLAIMED',?4,?5,?5)`).bind(auditId,account.tenantId,recordId,correlationId,inbound.receivedAt),
      ]);
      const record = await this.findDelivery(account.channelAccountKey,inbound.externalEventId);
      if (!record) throw new ChannelAdapterError("CHANNEL_STORAGE_FAILED");
      return Object.freeze({disposition:"execute",record,result:null});
    } catch (error) {
      const winner = await this.findDelivery(account.channelAccountKey,inbound.externalEventId);
      if (!winner) throw error;
      return this.reclaim(winner,inbound.payloadDigest,leaseOwner,inbound.receivedAt,leaseMs);
    }
  }
  private async reclaim(existing:DeliveryRow,payloadDigest:string,leaseOwner:string,now:number,leaseMs:number):Promise<DeliveryClaim> {
    if (existing.payload_digest!==payloadDigest) throw new ChannelAdapterError("CHANNEL_EVENT_CONFLICT");
    if ((existing.status==="completed"||existing.status==="rejected")&&existing.safe_result_json) return Object.freeze({disposition:"replay",record:existing,result:JSON.parse(existing.safe_result_json) as ChannelProcessResult});
    if (existing.status==="processing"&&(existing.lease_expires_at??0)>now) return Object.freeze({disposition:"processing",record:existing,result:null});
    const result = await this.db.prepare(`UPDATE channel_delivery_records SET status='processing',lease_owner=?1,fencing_token=fencing_token+1,lease_expires_at=?2,last_received_at=?3,attempt_count=attempt_count+1,failure_code=NULL,version=version+1,updated_at=?3 WHERE id=?4 AND payload_digest=?5 AND status IN ('processing','failed','received') AND (lease_expires_at IS NULL OR lease_expires_at<=?3) AND version=?6`).bind(leaseOwner,now+leaseMs,now,existing.id,payloadDigest,existing.version).run();
    if (result.meta.changes!==1) {
      const winner = await this.getDelivery(existing.tenant_id,existing.id);
      if (winner?.status==="completed"&&winner.safe_result_json) return Object.freeze({disposition:"replay",record:winner,result:JSON.parse(winner.safe_result_json) as ChannelProcessResult});
      return Object.freeze({disposition:"processing",record:winner??existing,result:null});
    }
    const claimed = await this.getDelivery(existing.tenant_id,existing.id);
    if (!claimed) throw new ChannelAdapterError("CHANNEL_STORAGE_FAILED");
    return Object.freeze({disposition:"execute",record:claimed,result:null});
  }
  async complete(input:Readonly<{record:DeliveryRow;leaseOwner:string;status:"completed"|"rejected";safeResult:ChannelProcessResult;resultDigest:string;identityOutcome:string;workbenchOutcome:string;responseType:string;inboundEventType:string;deliveryOutcome:"completed"|"rejected"|"failed";latencyMs:number;supportCode:string;evidenceId:string;auditId:string;correlationId:string;now:number;channelType:string}>):Promise<void> {
    const stored=JSON.stringify(input.safeResult);
    if(stored.length>2048||/reply.?token|access.?token|signature|raw.?uid|webhook|authorization|secret|stack|sql/i.test(stored)) throw new ChannelAdapterError("CHANNEL_RESPONSE_UNSAFE");
    try {
      await this.db.batch([
        this.db.prepare(`UPDATE channel_delivery_records SET status=?1,lease_owner=NULL,lease_expires_at=NULL,completed_at=?2,result_digest=?3,safe_result_json=?4,failure_code=NULL,version=version+1,updated_at=?2 WHERE tenant_id=?5 AND id=?6 AND status='processing' AND lease_owner=?7 AND fencing_token=?8`).bind(input.status,input.now,input.resultDigest,stored,input.record.tenant_id,input.record.id,input.leaseOwner,input.record.fencing_token),
        this.db.prepare(`INSERT INTO channel_delivery_evidence(delivery_id,tenant_id,application_id,channel_type,channel_account_key,external_event_id,inbound_event_type,delivery_record_id,fencing_token,identity_resolution_outcome,workbench_outcome,response_type,delivery_outcome,attempt_count,latency_ms,support_code,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)`).bind(input.evidenceId,input.record.tenant_id,input.record.application_id,input.channelType,input.record.channel_account_key,input.record.external_event_id,input.inboundEventType,input.record.id,input.record.fencing_token,input.identityOutcome,input.workbenchOutcome,input.responseType,input.deliveryOutcome,input.record.attempt_count,Math.min(300000,Math.max(0,input.latencyMs)),input.supportCode,input.now),        this.db.prepare(`INSERT INTO audit_records(id,scope_type,tenant_id,actor_type,actor_reference,action,resource_type,resource_reference,decision,reason_code,correlation_reference,occurred_at,created_at) SELECT ?1,'tenant',r.tenant_id,'service','channel-adapter','channel.delivery.complete','channel_delivery_record',r.id,'changed',?2,?3,?4,?4 FROM channel_delivery_records r WHERE r.tenant_id=?5 AND r.id=?6 AND r.status=?7 AND r.fencing_token=?8`).bind(input.auditId,input.workbenchOutcome,input.correlationId,input.now,input.record.tenant_id,input.record.id,input.status,input.record.fencing_token),
      ]);
    } catch { throw new ChannelAdapterError("CHANNEL_STALE_COMPLETION"); }
  }
  async resolveIdentity(account:ChannelAccount,digest:string):Promise<ChannelIdentityResolution> {
    const row=await this.db.prepare(`SELECT l.tenant_id,l.application_id,l.identity_id,l.membership_id,l.status,m.status membership_status,a.status application_status FROM channel_identity_links l JOIN tenant_memberships m ON m.tenant_id=l.tenant_id AND m.id=l.membership_id JOIN applications a ON a.tenant_id=l.tenant_id AND a.id=l.application_id WHERE l.channel_account_key=?1 AND l.external_user_reference_digest=?2 LIMIT 1`).bind(account.channelAccountKey,digest).first<{tenant_id:string;application_id:string;identity_id:string;membership_id:string;status:"linked"|"suspended"|"revoked"|"pending";membership_status:string;application_status:string}>();
    if(!row) return Object.freeze({outcome:"not_linked",tenantId:null,applicationId:null,identityId:null,membershipId:null});
    if(row.tenant_id!==account.tenantId||row.application_id!==account.applicationId||row.membership_status!=="active"||row.application_status!=="active") return Object.freeze({outcome:"mismatch",tenantId:null,applicationId:null,identityId:null,membershipId:null});
    if(row.status!=="linked") return Object.freeze({outcome:row.status==="revoked"?"revoked":row.status==="suspended"?"suspended":"not_linked",tenantId:null,applicationId:null,identityId:null,membershipId:null});
    return Object.freeze({outcome:"linked",tenantId:row.tenant_id,applicationId:row.application_id,identityId:row.identity_id,membershipId:row.membership_id});
  }
  async findDelivery(accountKey:string,externalEventId:string){ return this.db.prepare(`${DELIVERY_SELECT} WHERE channel_account_key=?1 AND external_event_id=?2 LIMIT 1`).bind(accountKey,externalEventId).first<DeliveryRow>(); }
  async getDelivery(tenantId:string,id:string){ return this.db.prepare(`${DELIVERY_SELECT} WHERE tenant_id=?1 AND id=?2 LIMIT 1`).bind(tenantId,id).first<DeliveryRow>(); }
  async listEvents(tenantId:string,limit=50){const rows=await this.db.prepare(`SELECT id,channel_account_key,external_event_id,event_type,received_at,payload_digest FROM channel_inbound_events WHERE tenant_id=?1 ORDER BY received_at DESC,id DESC LIMIT ?2`).bind(tenantId,bounded(limit)).all();return Object.freeze(rows.results);}
  async listDeliveries(tenantId:string,limit=50){const rows=await this.db.prepare(`SELECT delivery_id,channel_type,channel_account_key,external_event_id,identity_resolution_outcome,workbench_outcome,response_type,delivery_outcome,attempt_count,latency_ms,support_code,created_at FROM channel_delivery_evidence WHERE tenant_id=?1 ORDER BY created_at DESC,delivery_id DESC LIMIT ?2`).bind(tenantId,bounded(limit)).all();return Object.freeze(rows.results);}
}

