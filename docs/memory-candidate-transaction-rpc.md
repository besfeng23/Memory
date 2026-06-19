# Memory Candidate Transaction RPC

Pandora Memory Engine now has an internal database-backed transaction path for saving validated memory candidates.

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

`saveMemoryCandidateTransaction` prepares an already validated memory candidate request and calls the database function.

It uses:

- memory candidate validation
- user and namespace scoped idempotency fingerprinting
- typed internal RPC client boundary
- result guards before returning service data

## Why This Matters

This is the first internal mutation path where memory row creation and idempotency completion are coordinated by a single database function call.

It is safer than running memory item write, source write, and idempotency finish as separate app-layer calls.

## Current Limits

The function does not perform OpenAI extraction.

The function expects the service layer to validate candidates before calling it.

The function is internal and not exposed through a public route.

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

Prompt 23 should add tests and then connect this transaction RPC path into mutation orchestration as an internal selectable strategy.
