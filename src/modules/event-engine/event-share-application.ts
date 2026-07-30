import type { MutationContext } from "../../application/core-services";
import { TenantBoundaryError } from "../../persistence/models";
import { EventAdminApplication } from "./event-admin-application";
import {
  EventEngineError,
  type EventShareLink,
  type EventSharePayload,
} from "./models";

export class EventShareApplication extends EventAdminApplication {  async createShareLink(
    tenantId: string,
    actorMembershipId: string,
    eventId: string,
    sessionId: string | null,
    adapterKey: string,
    context: MutationContext,
  ): Promise<{ readonly link: EventShareLink; readonly payload: EventSharePayload }> {
    await this.requireEventPermission(tenantId, actorMembershipId, "manage");
    this.validateText("share adapter", adapterKey, 40);
    const [event, session] = await Promise.all([
      this.eventRepository.getEvent(tenantId, eventId),
      sessionId
        ? this.eventRepository.getSession(tenantId, eventId, sessionId)
        : Promise.resolve(null),
    ]);
    if (!event || (sessionId && !session)) throw new TenantBoundaryError();
    if (event.status !== "published") {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    const id = this.uuidv7.generate();
    const link: EventShareLink = {
      id,
      tenantId,
      eventId,
      eventSessionId: sessionId,
      adapterKey,
      payloadVersion: 1,
      status: "active",
    };
    const payload: EventSharePayload = {
      version: 1,
      shareReference: id,
      tenantReference: tenantId,
      eventReference: eventId,
      sessionReference: sessionId,
      title: event.title,
    };
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.share.create",
      { tenantId, actorMembershipId, eventId, sessionId, adapterKey },
      context,
      (timestamp) => ({
        result: { link, payload },
        statements: [
          this.db
            .prepare(
              `INSERT INTO event_share_links (
                id, tenant_id, event_id, event_session_id,
                created_by_membership_id, adapter_key, payload_version,
                status, created_at, revoked_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, 1, 'active', ?7, NULL
              )`,
            )
            .bind(
              id,
              tenantId,
              eventId,
              sessionId,
              actorMembershipId,
              adapterKey,
              timestamp,
            ),
        ],
        audit: {
          action: "event.share.create",
          resourceType: "event_share_link",
          resourceReference: id,
          reasonCode: "CREATED",
        },
      }),
    );
  }

  async recordShareTouch(
    tenantId: string,
    shareLinkId: string,
    platformUserId: string | null,
    context: MutationContext,
  ): Promise<{ readonly id: string; readonly shareLinkId: string }> {
    const link = await this.eventRepository.getShareLink(tenantId, shareLinkId);
    if (!link) throw new TenantBoundaryError();
    if (link.status !== "active") {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    if (platformUserId) await this.requireActivePlatformUser(platformUserId);
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.share.touch",
      { tenantId, shareLinkId, platformUserId },
      context,
      (timestamp) => ({
        result: { id, shareLinkId },
        statements: [
          this.db
            .prepare(
              `INSERT INTO event_share_touches (
                id, tenant_id, event_id, share_link_id,
                platform_user_id, touched_at, created_at
              ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`,
            )
            .bind(
              id,
              tenantId,
              link.eventId,
              shareLinkId,
              platformUserId,
              timestamp,
            ),
        ],
        audit: {
          action: "event.share.touch",
          resourceType: "event_share_touch",
          resourceReference: id,
          reasonCode: "RECORDED",
        },
      }),
    );
  }}
