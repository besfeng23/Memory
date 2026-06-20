# Memory ingest transactional RPC boundary

This document describes the draft boundary for a future Supabase Postgres RPC named `memory_ingest_apply_transaction`.

## Current status

- This PR defines TypeScript contracts, adapter validation, mocked-client tests, and a migration-safe SQL draft only.
- The public `/api/memory/ingest` route is still production-disabled and is not wired to this adapter.
- No live Supabase credentials are used and no live Supabase writes are performed.
- Tests use mocked `.rpc(...)` clients only.

## Transaction expectations

Future production use must go through the route safety gates before this boundary can be called. The RPC must be atomic: inserting the source, memory item, memory patch, audit log, and idempotency finalization must succeed or rollback together. Idempotency finalization is last so a failed transaction never records a completed request.

Writes are append-only. The boundary rejects update, delete, upsert, replace, overwrite, or silent-replacement behavior.

## Ownership and namespace isolation

The authenticated repository context is the ownership boundary. The adapter derives `userId` only from server repository context and rejects `user_id` or `userId` inside payloads.

Namespace isolation is mandatory:

- `real_life` writes remain `real_life` scoped.
- `au` writes remain fictional/story scoped.
- AU/story data must never be treated as real-life evidence.

## Explicit non-goals

This boundary does not introduce model calls, retrieval, pgvector, GPT Actions, MCP, seed data, fake production rows, public route activation, or service-role client construction.
