# Transaction and Idempotency Scaffolding

Pandora Memory Engine includes internal scaffolding for transaction boundaries, idempotency fingerprints, persistent idempotency records, and database-backed idempotency RPC helpers.

This is not a public mutation system yet.

## Files

```text
lib/services/transaction-boundary.ts
lib/services/idempotency.ts
lib/services/persistent-idempotency.ts
lib/services/idempotency-rpc.ts
supabase/migrations/20260620000300_persistent_idempotency.sql
supabase/migrations/20260620000400_idempotency_rpc_strategy.sql
```

## What Exists

The transaction boundary provides:

- `runTransactionBoundary`
- `createInlineTransactionAdapter`
- typed `TransactionAdapter`
- typed `TransactionBoundaryContext`

The idempotency helper provides:

- `validateIdempotencyKey`
- `buildIdempotencyContext`
- scoped fingerprints tied to user, namespace, operation, and key

The persistent idempotency layer provides:

- `prepareIdempotencyRecord`
- `saveIdempotencyRecord`
- `findIdempotencyRecord`
- `idempotency_records` table
- owner and namespace scoped RLS

The database RPC strategy provides:

- `claim_idempotency_record`
- `finish_idempotency_record`
- `claimIdempotencyRecord`
- `finishIdempotencyRecord`

## Transaction Boundary

`runTransactionBoundary` can require a real transaction adapter before running an operation.

If no adapter is supplied and `requireTransaction` is `true`, the operation fails before mutation.

If no adapter is supplied and `requireTransaction` is `false`, the operation runs inline. This exists only for internal scaffolding and tests.

## Idempotency Boundary

Idempotency context can be built from:

- client key
- request id
- payload hash

The resulting fingerprint includes:

- user id
- namespace
- scope
- operation
- normalized key

This prevents cross-user and cross-namespace key reuse from colliding.

## Persistent Storage

`idempotency_records` stores:

- owner id
- namespace
- scope
- operation
- idempotency key
- key source
- fingerprint
- request hash
- response hash
- status
- metadata
- expiry time

The table has a unique `(user_id, namespace, fingerprint)` constraint.

## RLS

The table has row-level security enabled and forced.

Authenticated users can only select, insert, and update rows where `auth.uid() = user_id`.

There is no delete policy.

## Database RPC Strategy

The database function strategy coordinates idempotency claims and final outcomes inside PostgreSQL.

`claim_idempotency_record` attempts the claim under the unique owner, namespace, and fingerprint constraint.

`finish_idempotency_record` records the final completed or failed status for the authenticated user and matching fingerprint.

These functions are still not public routes. They are internal database helpers for future server-side service orchestration.

## Important Limit

Memory row writes, source writes, patch writes, audit writes, and idempotency finish writes are not all committed inside one memory-specific database function yet.

Public mutation routes must not be exposed until mutation behavior and durable conflict handling are implemented end-to-end.

## What This Does Not Add

This step does not add:

- public API routes
- public mutation behavior
- OpenAI calls
- pgvector retrieval
- memory ingest
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Next Step

Prompt 21 should integrate the RPC claim and finish helpers into internal mutation safety orchestration while still avoiding public mutation routes.
