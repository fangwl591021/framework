import type {
  EventCheckin,
  EventFormField,
  EventPayment,
  EventRecord,
  EventRegistration,
  EventRegistrationAnswer,
  EventRosterEntry,
  EventSession,
  EventShareLink,
  EventStatistics,
} from "./models";
interface EventRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  status: EventRecord["status"];
  registration_opens_at: number;
  registration_closes_at: number;
  payment_mode: EventRecord["paymentMode"];
  version: number;
}

interface SessionRow {
  id: string;
  tenant_id: string;
  event_id: string;
  title: string;
  starts_at: number;
  ends_at: number;
  capacity: number;
  waitlist_capacity: number;
  confirmed_count: number;
  waitlisted_count: number;
  reconciliation_required: number;
  status: EventSession["status"];
  version: number;
}

interface FieldRow {
  id: string;
  tenant_id: string;
  event_id: string;
  field_key: string;
  label: string;
  field_type: EventFormField["fieldType"];
  required: number;
  options_json: string | null;
  display_order: number;
  status: EventFormField["status"];
}

interface RegistrationRow {
  id: string;
  tenant_id: string;
  event_id: string;
  event_session_id: string;
  platform_user_id: string;
  status: EventRegistration["status"];
  source_adapter: string;
  version: number;
  registered_at: number;
}

interface PaymentRow {
  id: string;
  tenant_id: string;
  event_id: string;
  registration_id: string;
  status: EventPayment["status"];
  amount_minor: number;
  currency: string;
  version: number;
}

interface CheckinRow {
  id: string;
  tenant_id: string;
  event_id: string;
  event_session_id: string;
  registration_id: string;
  verified_by_membership_id: string;
  method: EventCheckin["method"];
  status: EventCheckin["status"];
  checked_in_at: number;
}

interface ShareLinkRow {
  id: string;
  tenant_id: string;
  event_id: string;
  event_session_id: string | null;
  adapter_key: string;
  payload_version: number;
  status: EventShareLink["status"];
}

function eventFromRow(row: EventRow): EventRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    status: row.status,
    registrationOpensAt: row.registration_opens_at,
    registrationClosesAt: row.registration_closes_at,
    paymentMode: row.payment_mode,
    version: row.version,
  };
}

function sessionFromRow(row: SessionRow): EventSession {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    waitlistCapacity: row.waitlist_capacity,
    confirmedCount: row.confirmed_count,
    waitlistedCount: row.waitlisted_count,
    reconciliationRequired: row.reconciliation_required === 1,
    status: row.status,
    version: row.version,
  };
}

function fieldFromRow(row: FieldRow): EventFormField {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    required: row.required === 1,
    options: row.options_json
      ? (JSON.parse(row.options_json) as readonly string[])
      : null,
    displayOrder: row.display_order,
    status: row.status,
  };
}

function registrationFromRow(row: RegistrationRow): EventRegistration {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    eventSessionId: row.event_session_id,
    platformUserId: row.platform_user_id,
    status: row.status,
    sourceAdapter: row.source_adapter,
    version: row.version,
    registeredAt: row.registered_at,
  };
}

function paymentFromRow(row: PaymentRow): EventPayment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    registrationId: row.registration_id,
    status: row.status,
    amountMinor: row.amount_minor,
    currency: row.currency,
    version: row.version,
  };
}

function checkinFromRow(row: CheckinRow): EventCheckin {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    eventSessionId: row.event_session_id,
    registrationId: row.registration_id,
    verifiedByMembershipId: row.verified_by_membership_id,
    method: row.method,
    status: row.status,
    checkedInAt: row.checked_in_at,
  };
}

function shareLinkFromRow(row: ShareLinkRow): EventShareLink {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    eventSessionId: row.event_session_id,
    adapterKey: row.adapter_key,
    payloadVersion: row.payload_version,
    status: row.status,
  };
}

const EVENT_COLUMNS = `
  id, tenant_id, title, description, status, registration_opens_at,
  registration_closes_at, payment_mode, version`;

const SESSION_COLUMNS = `
  id, tenant_id, event_id, title, starts_at, ends_at, capacity,
  waitlist_capacity, confirmed_count, waitlisted_count,
  reconciliation_required, status, version`;

const REGISTRATION_COLUMNS = `
  id, tenant_id, event_id, event_session_id, platform_user_id, status,
  source_adapter, version, registered_at`;

export class EventEngineRepository {
  constructor(private readonly db: D1Database) {}

  async getEvent(tenantId: string, eventId: string): Promise<EventRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT ${EVENT_COLUMNS}
         FROM events WHERE tenant_id = ?1 AND id = ?2`,
      )
      .bind(tenantId, eventId)
      .first<EventRow>();
    return row ? eventFromRow(row) : null;
  }

  async getSession(
    tenantId: string,
    eventId: string,
    sessionId: string,
  ): Promise<EventSession | null> {
    const row = await this.db
      .prepare(
        `SELECT ${SESSION_COLUMNS}
         FROM event_sessions
         WHERE tenant_id = ?1 AND event_id = ?2 AND id = ?3`,
      )
      .bind(tenantId, eventId, sessionId)
      .first<SessionRow>();
    return row ? sessionFromRow(row) : null;
  }

  async getSessionById(
    tenantId: string,
    sessionId: string,
  ): Promise<EventSession | null> {
    const row = await this.db
      .prepare(
        `SELECT ${SESSION_COLUMNS}
         FROM event_sessions
         WHERE tenant_id = ?1 AND id = ?2`,
      )
      .bind(tenantId, sessionId)
      .first<SessionRow>();
    return row ? sessionFromRow(row) : null;
  }

  async listSessions(
    tenantId: string,
    eventId: string,
  ): Promise<readonly EventSession[]> {
    const result = await this.db
      .prepare(
        `SELECT ${SESSION_COLUMNS}
         FROM event_sessions
         WHERE tenant_id = ?1 AND event_id = ?2
         ORDER BY starts_at, id LIMIT 100`,
      )
      .bind(tenantId, eventId)
      .all<SessionRow>();
    return result.results.map(sessionFromRow);
  }

  async listFields(
    tenantId: string,
    eventId: string,
  ): Promise<readonly EventFormField[]> {
    const result = await this.db
      .prepare(
        `SELECT id, tenant_id, event_id, field_key, label, field_type,
                required, options_json, display_order, status
         FROM event_form_fields
         WHERE tenant_id = ?1 AND event_id = ?2 AND status = 'active'
         ORDER BY display_order, id LIMIT 100`,
      )
      .bind(tenantId, eventId)
      .all<FieldRow>();
    return result.results.map(fieldFromRow);
  }

  async getRegistration(
    tenantId: string,
    registrationId: string,
  ): Promise<EventRegistration | null> {
    const row = await this.db
      .prepare(
        `SELECT ${REGISTRATION_COLUMNS}
         FROM event_registrations
         WHERE tenant_id = ?1 AND id = ?2`,
      )
      .bind(tenantId, registrationId)
      .first<RegistrationRow>();
    return row ? registrationFromRow(row) : null;
  }

  async findActiveRegistration(
    tenantId: string,
    sessionId: string,
    platformUserId: string,
  ): Promise<EventRegistration | null> {
    const row = await this.db
      .prepare(
        `SELECT ${REGISTRATION_COLUMNS}
         FROM event_registrations
         WHERE tenant_id = ?1 AND event_session_id = ?2
           AND platform_user_id = ?3
           AND status IN ('confirmed', 'waitlisted')
         LIMIT 1`,
      )
      .bind(tenantId, sessionId, platformUserId)
      .first<RegistrationRow>();
    return row ? registrationFromRow(row) : null;
  }

  async findEarliestWaitlisted(
    tenantId: string,
    sessionId: string,
    excludingRegistrationId: string,
  ): Promise<EventRegistration | null> {
    const row = await this.db
      .prepare(
        `SELECT ${REGISTRATION_COLUMNS}
         FROM event_registrations
         WHERE tenant_id = ?1 AND event_session_id = ?2
           AND status = 'waitlisted' AND id <> ?3
         ORDER BY registered_at, id LIMIT 1`,
      )
      .bind(tenantId, sessionId, excludingRegistrationId)
      .first<RegistrationRow>();
    return row ? registrationFromRow(row) : null;
  }

  async getPayment(
    tenantId: string,
    registrationId: string,
  ): Promise<EventPayment | null> {
    const row = await this.db
      .prepare(
        `SELECT id, tenant_id, event_id, registration_id, status,
                amount_minor, currency, version
         FROM event_payments
         WHERE tenant_id = ?1 AND registration_id = ?2`,
      )
      .bind(tenantId, registrationId)
      .first<PaymentRow>();
    return row ? paymentFromRow(row) : null;
  }

  async getCheckin(
    tenantId: string,
    registrationId: string,
  ): Promise<EventCheckin | null> {
    const row = await this.db
      .prepare(
        `SELECT id, tenant_id, event_id, event_session_id, registration_id,
                verified_by_membership_id, method, status, checked_in_at
         FROM event_checkins
         WHERE tenant_id = ?1 AND registration_id = ?2 AND status = 'verified'
         LIMIT 1`,
      )
      .bind(tenantId, registrationId)
      .first<CheckinRow>();
    return row ? checkinFromRow(row) : null;
  }

  async getShareLink(
    tenantId: string,
    shareLinkId: string,
  ): Promise<EventShareLink | null> {
    const row = await this.db
      .prepare(
        `SELECT id, tenant_id, event_id, event_session_id, adapter_key,
                payload_version, status
         FROM event_share_links
         WHERE tenant_id = ?1 AND id = ?2`,
      )
      .bind(tenantId, shareLinkId)
      .first<ShareLinkRow>();
    return row ? shareLinkFromRow(row) : null;
  }

  async listRoster(
    tenantId: string,
    eventId: string,
    limit = 100,
  ): Promise<readonly EventRosterEntry[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    interface RosterRow extends RegistrationRow {
      payment_status: EventPayment["status"];
      checked_in: number;
    }
    interface AnswerRow {
      registration_id: string;
      form_field_id: string;
      field_key: string;
      label: string;
      value_json: string;
    }
    const rosterResults = await this.db.batch([
      this.db
        .prepare(
          `SELECT registration.id, registration.tenant_id,
                  registration.event_id, registration.event_session_id,
                  registration.platform_user_id, registration.status,
                  registration.source_adapter, registration.version,
                  registration.registered_at,
                  payment.status AS payment_status,
                  CASE WHEN checkin.id IS NULL THEN 0 ELSE 1 END AS checked_in
           FROM event_registrations AS registration
           JOIN event_payments AS payment
             ON payment.tenant_id = registration.tenant_id
            AND payment.registration_id = registration.id
           LEFT JOIN event_checkins AS checkin
             ON checkin.tenant_id = registration.tenant_id
            AND checkin.registration_id = registration.id
            AND checkin.status = 'verified'
           WHERE registration.tenant_id = ?1 AND registration.event_id = ?2
           ORDER BY registration.registered_at, registration.id LIMIT ?3`,
        )
        .bind(tenantId, eventId, safeLimit),
      this.db
        .prepare(
          `SELECT answer.registration_id, answer.form_field_id,
                  field.field_key, field.label, answer.value_json
           FROM event_registration_answers AS answer
           JOIN event_form_fields AS field
             ON field.tenant_id = answer.tenant_id
            AND field.event_id = answer.event_id
            AND field.id = answer.form_field_id
           JOIN event_registrations AS registration
             ON registration.tenant_id = answer.tenant_id
            AND registration.event_id = answer.event_id
            AND registration.id = answer.registration_id
           WHERE answer.tenant_id = ?1 AND answer.event_id = ?2
           ORDER BY registration.registered_at, registration.id,
                    field.display_order, field.id LIMIT ?3`,
        )
        .bind(tenantId, eventId, safeLimit * 100),
    ]);
    const registrations = rosterResults[0]!;
    const answers = rosterResults[1]!;
    const answersByRegistration = new Map<string, EventRegistrationAnswer[]>();
    for (const row of answers.results as unknown as AnswerRow[]) {
      const values = answersByRegistration.get(row.registration_id) ?? [];
      values.push({
        fieldId: row.form_field_id,
        fieldKey: row.field_key,
        label: row.label,
        value: JSON.parse(row.value_json) as unknown,
      });
      answersByRegistration.set(row.registration_id, values);
    }
    return (registrations.results as unknown as RosterRow[]).map((row) => ({
      ...registrationFromRow(row),
      answers: answersByRegistration.get(row.id) ?? [],
      paymentStatus: row.payment_status,
      checkedIn: row.checked_in === 1,
    }));
  }

  async getStatistics(
    tenantId: string,
    eventId: string,
  ): Promise<EventStatistics> {
    const statisticsResults = await this.db.batch([
      this.db
        .prepare(
          `SELECT
             sum(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
             sum(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END) AS waitlisted,
             sum(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
           FROM event_registrations
           WHERE tenant_id = ?1 AND event_id = ?2`,
        )
        .bind(tenantId, eventId),
      this.db
        .prepare(
          `SELECT count(*) AS count FROM event_checkins
           WHERE tenant_id = ?1 AND event_id = ?2 AND status = 'verified'`,
        )
        .bind(tenantId, eventId),
      this.db
        .prepare(
          `SELECT count(*) AS count FROM event_share_touches
           WHERE tenant_id = ?1 AND event_id = ?2`,
        )
        .bind(tenantId, eventId),
    ]);
    const registrations = statisticsResults[0]!;
    const checkins = statisticsResults[1]!;
    const touches = statisticsResults[2]!;
    const registrationCounts = registrations.results[0] as
      | { confirmed: number | null; waitlisted: number | null; cancelled: number | null }
      | undefined;
    const checkinCount = checkins.results[0] as { count: number } | undefined;
    const touchCount = touches.results[0] as { count: number } | undefined;
    return {
      eventId,
      confirmed: registrationCounts?.confirmed ?? 0,
      waitlisted: registrationCounts?.waitlisted ?? 0,
      cancelled: registrationCounts?.cancelled ?? 0,
      checkedIn: checkinCount?.count ?? 0,
      shareTouches: touchCount?.count ?? 0,
    };
  }
}
