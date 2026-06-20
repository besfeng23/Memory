# Memory Candidate Transaction RPC

Pandora Memory Engine has an internal database-backed transaction path for saving validated memory candidates.

This is not a public mutation API.

## Files

```text
supabase/migrations/20260620000500_memory_candidate_transaction.sql
lib/memory/services/candidate-transaction-service.ts
```

## Database Function

The migration adds:

```text
save_validated_memory_candidate_transaction
```

The function runs as an authenticated, owner-scoped PostgreSQL operation.

It performs these steps in one database function call:

1. Validate authenticated user presence through `auth.uid()`.
2. Claim the idempotency fingerprint.
3. Block duplicate claims before creating memory rows.
4. Insert one `memory_items` row.
5. Insert related `memory_sources` rows.
6. Mark the idempotency record as `completed`.
7. Return the memory item id, source ids, and idempotency record id.

## Internal Service Helper

`saveMemoryCandidateTransaction` validates and prepares a memory candidate request, then calls the database function.

It uses:

- memory candidate validation
- user and namespace scoped idempotency fingerprinting
- typed internal RPC client boundary
- result guards before returning service data
- validated input plus returned ids to build the persisted candidate result shape

## Result Shape

The service returns a shaped persisted candidate result instead of placeholder values.

The returned object contains:

- `memoryItem`
- `sources`
- `warnings`
- `idempotencyRecordId`

By default, `memoryItem` and `sources` are built from the validated service input plus the ids returned by the database function.

## Optional Readback

The service supports an internal `readBack` option.

When `readBack` is enabled, the service fetches the saved `memory_items` row and each saved `memory_sources` row through owner and namespace scoped repositories after the database function returns ids.

This is useful when exact database defaults, triggers, timestamps, or stored JSON values are needed in the service response.

`readBack` remains internal-only and still exposes no public mutation route.

## Why This Matters

This is the first internal mutation path where memory row creation and idempotency completion are coordinated by a single database function call.

It is safer than running memory item write, source write, and idempotency finish as separate app-layer calls.

## Current Limits

The function does not perform OpenAI extraction.

The function expects the service layer to validate candidates before calling it.

The function is internal and not exposed through a public route.

Readback performs additional repository reads after the database function returns ids. It is not a public API response contract yet.

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

Prompt 26 should add readback tests and then decide whether public-facing ingest will return shaped service data or exact readback rows once public routes are allowed.
