export type EventStatus = "draft" | "published" | "cancelled";
export type EventSessionStatus = "scheduled" | "cancelled";
export type EventRegistrationStatus = "confirmed" | "waitlisted" | "cancelled";
export type EventFieldType = "text" | "number" | "choice" | "checkbox";
export type EventPaymentStatus =
  | "not_required"
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

export interface EventRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly title: string;
  readonly description: string;
  readonly status: EventStatus;
  readonly registrationOpensAt: number;
  readonly registrationClosesAt: number;
  readonly paymentMode: "free" | "status_only";
  readonly version: number;
}

export interface EventSession {
  readonly id: string;
  readonly tenantId: string;
  readonly eventId: string;
  readonly title: string;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly capacity: number;
  readonly waitlistCapacity: number;
  readonly confirmedCount: number;
  readonly waitlistedCount: number;
  readonly reconciliationRequired: boolean;
  readonly status: EventSessionStatus;
  readonly version: number;
}

export interface CapacityReconciliationResult {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly reconciled: true;
}

export interface EventFormField {
  readonly id: string;
  readonly tenantId: string;
  readonly eventId: string;
  readonly fieldKey: string;
  readonly label: string;
  readonly fieldType: EventFieldType;
  readonly required: boolean;
  readonly options: readonly string[] | null;
  readonly displayOrder: number;
  readonly status: "active" | "archived";
}

export interface EventRegistration {
  readonly id: string;
  readonly tenantId: string;
  readonly eventId: string;
  readonly eventSessionId: string;
  readonly platformUserId: string;
  readonly status: EventRegistrationStatus;
  readonly sourceAdapter: string;
  readonly version: number;
  readonly registeredAt: number;
}

export interface EventRegistrationAnswer {
  readonly fieldId: string;
  readonly fieldKey: string;
  readonly label: string;
  readonly value: unknown;
}

export interface EventRosterEntry extends EventRegistration {
  readonly answers: readonly EventRegistrationAnswer[];
  readonly paymentStatus: EventPaymentStatus;
  readonly checkedIn: boolean;
}

export interface EventPayment {
  readonly id: string;
  readonly tenantId: string;
  readonly eventId: string;
  readonly registrationId: string;
  readonly status: EventPaymentStatus;
  readonly amountMinor: number;
  readonly currency: string;
  readonly version: number;
}

export interface EventCheckin {
  readonly id: string;
  readonly tenantId: string;
  readonly eventId: string;
  readonly eventSessionId: string;
  readonly registrationId: string;
  readonly verifiedByMembershipId: string;
  readonly method: "manual" | "qr";
  readonly status: "verified" | "revoked";
  readonly checkedInAt: number;
}

export interface EventShareLink {
  readonly id: string;
  readonly tenantId: string;
  readonly eventId: string;
  readonly eventSessionId: string | null;
  readonly adapterKey: string;
  readonly payloadVersion: number;
  readonly status: "active" | "revoked";
}

export interface EventSharePayload {
  readonly version: 1;
  readonly shareReference: string;
  readonly tenantReference: string;
  readonly eventReference: string;
  readonly sessionReference: string | null;
  readonly title: string;
}

export interface EventStatistics {
  readonly eventId: string;
  readonly confirmed: number;
  readonly waitlisted: number;
  readonly cancelled: number;
  readonly checkedIn: number;
  readonly shareTouches: number;
}

export interface CreateEventInput {
  readonly title: string;
  readonly description?: string;
  readonly registrationOpensAt: number;
  readonly registrationClosesAt: number;
  readonly paymentMode: "free" | "status_only";
}

export interface UpdateEventInput {
  readonly title: string;
  readonly description: string;
  readonly registrationOpensAt: number;
  readonly registrationClosesAt: number;
  readonly expectedVersion: number;
}

export interface CreateEventSessionInput {
  readonly title: string;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly capacity: number;
  readonly waitlistCapacity: number;
}

export interface CreateEventFieldInput {
  readonly fieldKey: string;
  readonly label: string;
  readonly fieldType: EventFieldType;
  readonly required: boolean;
  readonly options?: readonly string[];
  readonly displayOrder: number;
}

export interface RegistrationAnswerInput {
  readonly fieldId: string;
  readonly value: unknown;
}

export interface RegisterForEventInput {
  readonly eventId: string;
  readonly sessionId: string;
  readonly platformUserId: string;
  readonly sourceAdapter: string;
  readonly notificationAdapter: string;
  readonly answers: readonly RegistrationAnswerInput[];
}

export interface EventQrClaims {
  readonly version: 1;
  readonly tenantId: string;
  readonly eventId: string;
  readonly sessionId: string;
  readonly registrationId: string;
  readonly expiresAt: number;
  readonly nonce: string;
}

export class EventEngineError extends Error {
  constructor(
    readonly code:
      | "EVENT_PERMISSION_DENIED"
      | "EVENT_INVALID_STATE"
      | "EVENT_CAPACITY_FULL"
      | "EVENT_WAITLIST_FULL"
      | "EVENT_DUPLICATE_REGISTRATION"
      | "EVENT_REGISTRATION_CLOSED"
      | "EVENT_INVALID_ANSWERS"
      | "EVENT_CONCURRENT_MODIFICATION"
      | "EVENT_CHECKIN_NOT_ELIGIBLE"
      | "EVENT_DUPLICATE_CHECKIN"
      | "EVENT_QR_INVALID"
      | "EVENT_QR_EXPIRED"
      | "EVENT_RECONCILIATION_RETRY_REQUIRED",
  ) {
    super(code);
    this.name = "EventEngineError";
  }
}
