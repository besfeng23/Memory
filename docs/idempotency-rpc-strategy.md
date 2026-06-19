# Idempotency RPC Strategy

Pandora Memory Engine now includes a database-backed idempotency RPC strategy.

This is not a public mutation API.

## Files

```text
supabase/migrations/20260620000400_idempotency_rpc_strategy.sql
lib/services/idempotency-rpc.ts
```

## Database Functions

The migration adds:

- `claim_idempotency_record`
- `finish_idempotency_record`

Both functions run inside PostgreSQL as authenticated user-scoped operations.

## Claim Flow

`claim_idempotency_record` attempts to create a `started` idempotency record for the authenticated user, namespace, and fingerprint.

If the scoped fingerprint is new, the function returns:

```text
was_claimed = true
existing_status = started
```

If the scoped fingerprint already exists, the function returns:

```text
was_claimed = false
existing_status = <current status>
```

This gives future mutation services a database-backed duplicate detection boundary.

## Finish Flow

`finish_idempotency_record` marks a claimed record as either:

- `completed`
- `failed`

The function validates the authenticated user, namespace, record id, fingerprint, and final status.

## TypeScript Helpers

`lib/services/idempotency-rpc.ts` exposes:

- `claimIdempotencyRecord`
- `finishIdempotencyRecord`

The helpers:

- validate context against idempotency context before RPC calls
- call typed Supabase database functions
- map database rows to service-friendly result shapes
- return `RepositoryResult`

## What This Solves

This gives Pandora a real database coordination boundary for idempotency claims and outcomes.

It is safer than checking existing rows in application memory before writing because the claim is resolved inside the database under the unique `(user_id, namespace, fingerprint)` constraint.

## Current Limit

This does not make memory item writes, patch writes, source writes, audit writes, and idempotency finish writes all commit together yet.

Future work must integrate these RPC helpers into mutation orchestration and then move multi-write mutation behavior into a single database function or equivalent transaction-safe path.

## What This Does Not Add

This step does not add:

- public API routes
- public mutation behavior
- OpenAI calls
- pgvector retrieval
- memory ingest endpoint
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Next Step

Prompt 21 should integrate the RPC claim and finish helpers into the internal mutation safety orchestration while still avoiding public mutation routes.
