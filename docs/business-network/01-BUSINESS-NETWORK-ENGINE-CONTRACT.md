# Business Network Engine Module Contract

> Domain Module Candidate · Contract Proposed／Pending Tony Approval · Locally Implemented · Locally Verified · Not Deployed · Production Use Not Allowed

## Purpose and Boundary

Business Network Engine provides reusable Tenant-scoped partner, relationship, referral, attribution, sales-record, commission and team capabilities. It is not Platform Core and does not own Identity, Tenant, Membership, Authorization, Audit, Idempotency or UUID generation.

Excluded: payment movement, provider adapters, LINE, UI, AI Agent, CRM, Booking, multi-level commission, MLM ranking and automatic background attribution.

## Dependencies

Required Core contracts are Identity Core, Tenant Access, Authorization and Core Operations. Every mutation uses Core tenant-scoped Idempotency and minimal Audit. Platform User and Tenant Membership are stable references only.

## Owned Data

1. `network_partners`
2. `business_relationships`
3. `referral_links`
4. `referral_touches`
5. `sales_records`
6. `attribution_records`
7. `commission_rules`
8. `commission_records`
9. `partner_teams`
10. `partner_team_memberships`

Every record is Tenant-scoped. Composite foreign keys prevent cross-Tenant references. Historical relationships, sales, attribution and commissions are not deleted.

## Commands

- Create／suspend／close Network Partner.
- Create／close Business Relationship.
- Create Referral Link and record Referral Touch.
- Record Sale and transition it to cancelled／refunded／reversed.
- Attribute Sale using First Valid Touch.
- Create Commission Rule, calculate, approve, mark paid and explicitly reverse Commission.
- Create Partner Team and add Partner.

No command is a public HTTP API in this MVP.

## Queries

- `getMyPerformance(tenantId, membershipId, from, until)`
- `getMyCommission(tenantId, membershipId, limit)`
- `getMyReferrer(tenantId, membershipId)`
- `getMyReferrals(tenantId, membershipId, limit)`
- `getSaleAttribution(tenantId, membershipId, saleId)`
- `getTeamPerformance(tenantId, membershipId, teamId, from, until)`
- `getCommissionSummary(tenantId, membershipId, from, until)`

Lists are bounded to 100. Self queries resolve the active Tenant Membership to its active Partner; caller-supplied Partner IDs cannot bypass that mapping.

## Attribution

The MVP uses `first-valid-touch-v1`:

- Window is exactly 30 days.
- Touch must precede the Sale and not be expired.
- Referral Link and Partner must be active at attribution time.
- Earliest valid touch wins deterministically by `touched_at, id`.
- One immutable Attribution exists per Sale.
- Referral relationship and Sale attribution remain separate concepts.

No last-touch, weighted, multi-level or automatic correction is included.

## Commission

- Monetary values are integer minor units.
- Percentage `rate` is integer basis points (`1000` = 10%).
- Percentage result uses deterministic half-up division: `(base × rate + 5000) / 10000`.
- Fixed amount is already in minor units.
- Sale and Rule currency must match; no conversion occurs.
- Rule selection is deterministic by priority, target specificity and ID.
- Paid Commission is immutable.
- Reversal creates one separate, signed, uniquely linked reversal record; it does not edit or delete the paid record.

## Lifecycle

- Partner: `active → suspended | closed`; closed is terminal.
- Relationship: `active → closed`; delete is forbidden.
- Sale: confirmed may become cancelled／refunded; refunded may become reversed.
- Commission: `calculated → approved → paid`; reversal is a new `reversed` record.
- Attribution is immutable after creation.

## Permission

The module registers its own Domain Permission vocabulary through migration `0003`. Registration occurs while the Core immutable insert guard is temporarily lifted and the same guard is restored immediately. Existing Core Permissions and Core Role grants are not changed.

Tenant roles receive these Permissions only through explicit role creation／mapping. See [Permission and Data Boundary](03-PERMISSION-DATA-BOUNDARY.md).

## Audit and Idempotency

All mutations use the existing Core Operations atomic batch:

Idempotency claim → domain statements → minimal Audit → Stored Result completion.

Same key plus same fingerprint replays; same key plus another fingerprint conflicts. Audit excludes buyer／visitor references, rule payloads and raw identifiers. Stored Results redact buyer and visitor references.

## Compatibility and Approval

Version is `0.1.0-local`. Stable use cases: none. Local verification does not make this module Experimental, Stable, deployed or Production-ready. Tony approval is required before the Contract can become Approved.
