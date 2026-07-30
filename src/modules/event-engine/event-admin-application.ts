import type { MutationContext } from "../../application/core-services";
import { DomainNotFoundError, TenantBoundaryError } from "../../persistence/models";
import { EventEngineBase } from "./event-engine-base";
import {
  EventEngineError,
  type CreateEventFieldInput,
  type CreateEventInput,
  type CreateEventSessionInput,
  type EventFormField,
  type EventRecord,
  type EventSession,
  type UpdateEventInput,
} from "./models";

export class EventAdminApplication extends EventEngineBase {
  async createEvent(
    tenantId: string,
    actorMembershipId: string,
    input: CreateEventInput,
    context: MutationContext,
  ): Promise<EventRecord> {
    await this.requireEventPermission(tenantId, actorMembershipId, "manage");
    this.validateText("event title", input.title, 160);
    if (
      (input.description?.length ?? 0) > 3000
      || input.registrationOpensAt < 0
      || input.registrationClosesAt <= input.registrationOpensAt
    ) {
      throw new TypeError("Event input is invalid");
    }
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.create",
      { tenantId, actorMembershipId, input },
      context,
      (timestamp) => ({
        result: {
          id,
          tenantId,
          title: input.title.trim(),
          description: input.description ?? "",
          status: "draft",
          registrationOpensAt: input.registrationOpensAt,
          registrationClosesAt: input.registrationClosesAt,
          paymentMode: input.paymentMode,
          version: 1,
        } satisfies EventRecord,
        statements: [
          this.db
            .prepare(
              `INSERT INTO events (
                id, tenant_id, title, description, status,
                registration_opens_at, registration_closes_at, payment_mode,
                version, published_at, cancelled_at, created_at, updated_at
              ) VALUES (
                ?1, ?2, ?3, ?4, 'draft', ?5, ?6, ?7,
                1, NULL, NULL, ?8, ?8
              )`,
            )
            .bind(
              id,
              tenantId,
              input.title.trim(),
              input.description ?? "",
              input.registrationOpensAt,
              input.registrationClosesAt,
              input.paymentMode,
              timestamp,
            ),
        ],
        audit: {
          action: "event.create",
          resourceType: "event",
          resourceReference: id,
          reasonCode: "CREATED",
        },
      }),
    );
  }

  async updateEvent(
    tenantId: string,
    actorMembershipId: string,
    eventId: string,
    input: UpdateEventInput,
    context: MutationContext,
  ): Promise<EventRecord> {
    await this.requireEventPermission(tenantId, actorMembershipId, "manage");
    const replay = await this.replayEventResult<EventRecord>(
      tenantId, "event.update",
      { tenantId, actorMembershipId, eventId, input }, context,
    );
    if (replay.found) return replay.result;
    const current = await this.eventRepository.getEvent(tenantId, eventId);
    if (!current) throw new TenantBoundaryError();
    if (current.status === "cancelled") {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    this.validateText("event title", input.title, 160);
    if (
      input.description.length > 3000
      || input.registrationOpensAt < 0
      || input.registrationClosesAt <= input.registrationOpensAt
      || input.expectedVersion !== current.version
    ) {
      throw new EventEngineError("EVENT_CONCURRENT_MODIFICATION");
    }
    const result: EventRecord = {
      ...current,
      title: input.title.trim(),
      description: input.description,
      registrationOpensAt: input.registrationOpensAt,
      registrationClosesAt: input.registrationClosesAt,
      version: current.version + 1,
    };
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.update",
      { tenantId, actorMembershipId, eventId, input },
      context,
      (timestamp) => ({
        result,
        statements: [
          this.db
            .prepare(
              `UPDATE events
               SET title = ?1, description = ?2, registration_opens_at = ?3,
                   registration_closes_at = ?4, version = version + 1,
                   updated_at = ?5
               WHERE tenant_id = ?6 AND id = ?7 AND version = ?8
                 AND status <> 'cancelled'`,
            )
            .bind(
              input.title.trim(),
              input.description,
              input.registrationOpensAt,
              input.registrationClosesAt,
              timestamp,
              tenantId,
              eventId,
              input.expectedVersion,
            ),
        ],
        audit: {
          action: "event.update",
          resourceType: "event",
          resourceReference: eventId,
          reasonCode: "UPDATED",
        },
      }),
    );
  }

  async addSession(
    tenantId: string,
    actorMembershipId: string,
    eventId: string,
    input: CreateEventSessionInput,
    context: MutationContext,
  ): Promise<EventSession> {
    await this.requireEventPermission(tenantId, actorMembershipId, "manage");
    const replay = await this.replayEventResult<EventSession>(
      tenantId, "event.session.create",
      { tenantId, actorMembershipId, eventId, input }, context,
    );
    if (replay.found) return replay.result;
    const event = await this.eventRepository.getEvent(tenantId, eventId);
    if (!event) throw new TenantBoundaryError();
    if (
      event.status !== "draft"
      || input.startsAt < 0
      || input.endsAt <= input.startsAt
      || !Number.isInteger(input.capacity)
      || input.capacity <= 0
      || !Number.isInteger(input.waitlistCapacity)
      || input.waitlistCapacity < 0
    ) {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    this.validateText("session title", input.title, 160);
    const id = this.uuidv7.generate();
    const result: EventSession = {
      id,
      tenantId,
      eventId,
      title: input.title.trim(),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity,
      waitlistCapacity: input.waitlistCapacity,
      confirmedCount: 0,
      waitlistedCount: 0,
      status: "scheduled",
      version: 1,
    };
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.session.create",
      { tenantId, actorMembershipId, eventId, input },
      context,
      (timestamp) => ({
        result,
        statements: [
          this.db
            .prepare(
              `INSERT INTO event_sessions (
                id, tenant_id, event_id, title, starts_at, ends_at,
                capacity, waitlist_capacity, confirmed_count,
                waitlisted_count, status, version, created_at, updated_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, 0,
                'scheduled', 1, ?9, ?9
              )`,
            )
            .bind(
              id,
              tenantId,
              eventId,
              input.title.trim(),
              input.startsAt,
              input.endsAt,
              input.capacity,
              input.waitlistCapacity,
              timestamp,
            ),
        ],
        audit: {
          action: "event.session.create",
          resourceType: "event_session",
          resourceReference: id,
          reasonCode: "CREATED",
        },
      }),
    );
  }

  async addFormField(
    tenantId: string,
    actorMembershipId: string,
    eventId: string,
    input: CreateEventFieldInput,
    context: MutationContext,
  ): Promise<EventFormField> {
    await this.requireEventPermission(tenantId, actorMembershipId, "manage");
    const replay = await this.replayEventResult<EventFormField>(
      tenantId, "event.field.create",
      { tenantId, actorMembershipId, eventId, input }, context,
    );
    if (replay.found) return replay.result;
    const event = await this.eventRepository.getEvent(tenantId, eventId);
    if (!event) throw new TenantBoundaryError();
    if (event.status !== "draft" || input.displayOrder < 0) {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    this.validateText("field key", input.fieldKey, 80);
    this.validateText("field label", input.label, 160);
    const options =
      input.fieldType === "choice" ? [...new Set(input.options ?? [])] : null;
    if (
      (input.fieldType === "choice"
        && (!options?.length
          || options.some((option) => !option.trim() || option.length > 120)))
      || (input.fieldType !== "choice" && input.options !== undefined)
    ) {
      throw new EventEngineError("EVENT_INVALID_ANSWERS");
    }
    const id = this.uuidv7.generate();
    const result: EventFormField = {
      id,
      tenantId,
      eventId,
      fieldKey: input.fieldKey,
      label: input.label.trim(),
      fieldType: input.fieldType,
      required: input.required,
      options,
      displayOrder: input.displayOrder,
      status: "active",
    };
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.field.create",
      { tenantId, actorMembershipId, eventId, input: { ...input, options } },
      context,
      (timestamp) => ({
        result,
        statements: [
          this.db
            .prepare(
              `INSERT INTO event_form_fields (
                id, tenant_id, event_id, field_key, label, field_type,
                required, options_json, display_order, status,
                created_at, updated_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
                'active', ?10, ?10
              )`,
            )
            .bind(
              id,
              tenantId,
              eventId,
              input.fieldKey,
              input.label.trim(),
              input.fieldType,
              input.required ? 1 : 0,
              options ? JSON.stringify(options) : null,
              input.displayOrder,
              timestamp,
            ),
        ],
        audit: {
          action: "event.field.create",
          resourceType: "event_form_field",
          resourceReference: id,
          reasonCode: "CREATED",
        },
      }),
    );
  }

  async publishEvent(
    tenantId: string,
    actorMembershipId: string,
    eventId: string,
    context: MutationContext,
  ): Promise<EventRecord> {
    await this.requireEventPermission(tenantId, actorMembershipId, "manage");
    const replay = await this.replayEventResult<EventRecord>(
      tenantId, "event.publish",
      { tenantId, actorMembershipId, eventId }, context,
    );
    if (replay.found) return replay.result;
    const [event, sessions] = await Promise.all([
      this.eventRepository.getEvent(tenantId, eventId),
      this.eventRepository.listSessions(tenantId, eventId),
    ]);
    if (!event) throw new TenantBoundaryError();
    if (event.status !== "draft" || sessions.length === 0) {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.publish",
      { tenantId, actorMembershipId, eventId },
      context,
      (timestamp) => ({
        result: { ...event, status: "published", version: event.version + 1 },
        statements: [
          this.db
            .prepare(
              `UPDATE events
               SET status = 'published', published_at = ?1,
                   version = version + 1, updated_at = ?1
               WHERE tenant_id = ?2 AND id = ?3 AND status = 'draft'`,
            )
            .bind(timestamp, tenantId, eventId),
        ],
        audit: {
          action: "event.publish",
          resourceType: "event",
          resourceReference: eventId,
          reasonCode: "PUBLISHED",
        },
      }),
    );
  }

  async cancelEvent(
    tenantId: string,
    actorMembershipId: string,
    eventId: string,
    notificationAdapter: string,
    context: MutationContext,
  ): Promise<EventRecord> {
    await this.requireEventPermission(tenantId, actorMembershipId, "manage");
    this.validateText("notification adapter", notificationAdapter, 40);
    const replay = await this.replayEventResult<EventRecord>(
      tenantId, "event.cancel",
      { tenantId, actorMembershipId, eventId, notificationAdapter }, context,
    );
    if (replay.found) return replay.result;
    const event = await this.eventRepository.getEvent(tenantId, eventId);
    if (!event) throw new TenantBoundaryError();
    if (event.status === "cancelled") {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    const notificationId = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.cancel",
      { tenantId, actorMembershipId, eventId, notificationAdapter },
      context,
      (timestamp) => ({
        result: { ...event, status: "cancelled", version: event.version + 1 },
        statements: [
          this.db
            .prepare(
              `UPDATE events
               SET status = 'cancelled', cancelled_at = ?1,
                   version = version + 1, updated_at = ?1
               WHERE tenant_id = ?2 AND id = ?3 AND status <> 'cancelled'`,
            )
            .bind(timestamp, tenantId, eventId),
          this.db
            .prepare(
              `UPDATE event_sessions
               SET status = 'cancelled', version = version + 1, updated_at = ?1
               WHERE tenant_id = ?2 AND event_id = ?3
                 AND status = 'scheduled'`,
            )
            .bind(timestamp, tenantId, eventId),
          this.db
            .prepare(
              `UPDATE event_registrations
               SET status = 'cancelled', cancelled_at = ?1,
                   version = version + 1, updated_at = ?1
               WHERE tenant_id = ?2 AND event_id = ?3
                 AND status IN ('confirmed', 'waitlisted')`,
            )
            .bind(timestamp, tenantId, eventId),
          this.db
            .prepare(
              `INSERT INTO event_notifications (
                id, tenant_id, event_id, registration_id,
                recipient_platform_user_id, notification_type, adapter_key,
                status, created_at, updated_at, sent_at
              ) VALUES (
                ?1, ?2, ?3, NULL, NULL, 'event_cancelled', ?4,
                'pending', ?5, ?5, NULL
              )`,
            )
            .bind(notificationId, tenantId, eventId, notificationAdapter, timestamp),
        ],
        audit: {
          action: "event.cancel",
          resourceType: "event",
          resourceReference: eventId,
          reasonCode: "CANCELLED",
        },
      }),
    );
  }

}
