# Transaction and Idempotency Scaffolding

Pandora Memory Engine includes internal scaffolding for transaction boundaries, idempotency fingerprints, and persistent idempotency records.

This is not a public mutation system yet.

## Files

```text
lib/services/transaction-boundary.ts
lib/services/idempotency.ts
lib/services/persistent-idempotency.ts
supabase/migrations/20260620000300_persistent_idempotency.sql
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

## Important Limit

A real database transaction adapter is still not implemented.

Public mutation routes must not be exposed until transaction behavior and durable conflict handling are implemented end-to-end.

## What This Does Not Add

This step does not add:

- public API routes
- database transaction implementation
- public mutation behavior
- OpenAI calls
- pgvector retrieval
- memory ingest
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Next Step

Prompt 19 should add a real transaction adapter strategy or integrate idempotency checks into internal mutation services, still without public mutation routes.
