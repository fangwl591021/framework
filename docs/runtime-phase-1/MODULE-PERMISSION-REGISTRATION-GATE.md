# Module Permission Registration Gate

## Ownership

The Authorization module owns the `permissions` table, its lifecycle, and its immutable guards. A Domain Module owns only its reviewed Permission keys and usage policy; it never owns or administers the Core table.

## Allowed Execution Boundary

New Domain Permission keys may be registered only by a formally reviewed, versioned migration. The approved migration runner must apply the complete migration and its ledger record as one atomic Local D1 transaction.

## Atomicity

If registration requires temporarily removing an immutable guard, guard removal, exact Permission inserts, guard restoration, and the migration ledger write are one indivisible transaction. The migration is successful only when every statement commits.

## Required Verification

- Fresh migration application succeeds.
- Every approved key exists exactly once.
- The immutable insert, update, and delete guards exist after commit.
- Ordinary insert, update, delete, and duplicate-key attempts fail.
- Reapplying the migration list is safe through the migration ledger.
- A forced failure before guard restoration rolls back guard removal and every inserted key.

## Failure Behavior

Any statement failure must roll back the entire migration. The pre-migration immutable guard must remain effective, no partial Domain Permission vocabulary may remain, and no migration ledger row may be recorded. A runner that executes statements independently is forbidden.

## Forbidden Runtime Registration

Runtime Services, Tenants, administrators, public or internal APIs, Workers, and Module code may not insert, update, delete, or dynamically register Permission vocabulary. They may only reference keys installed through this Gate.
