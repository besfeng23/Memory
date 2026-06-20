# Memory Review Queue Storage/API/UI Foundation

This PR adds the next review queue foundation only. It introduces a storage boundary draft, repository contracts, test-only in-memory repository behavior, a Supabase repository skeleton, disabled/read-only API stubs, and a safe Review Queue UI shell.

## Safety status

- Production approvals are still disabled.
- Memory persistence is still not activated.
- `/api/memory/ingest` remains production-disabled and must not write memory.
- Review API routes are disabled/read-only stubs and do not approve, create decisions, or persist memory.
- The UI is a safe shell that displays disabled/review-only state rather than live production rows.
- No model calls, retrieval activation, embeddings, pgvector, GPT Actions, MCP, seed rows, fake production rows, or production writes are introduced.

## Storage boundary

The migration draft `supabase/migrations/20260620000800_memory_review_queue_storage_boundary.sql` documents future `memory_review_queue_items` and `memory_review_queue_decisions` tables. It is intentionally a commented placeholder until RLS readiness is reviewed. Future storage must include owner columns, explicit namespace columns, status columns, evidence/sensitivity/source/audit JSON snapshots, and append-only decision history.

Namespace and candidate content are immutable after creation. No silent overwrites are allowed. Archive is status-only and never deletes.

## Repository boundary

`MemoryReviewQueueRepository` requires `RepositoryContext` for every method. User ownership comes only from `context.userId`; client-supplied `user_id` is never trusted. Namespace scoping comes from `context.namespace` and must remain explicit for `real_life` and `au`.

Approving a review item does not automatically persist memory. Decisions are append-only records.

## Namespace rules

- AU/story data must never be treated as real-life evidence.
- Real-life data must not enter AU unless explicitly marked fictionalized and reviewed.
- Mixed content requires review and must not auto-persist.
- Namespace isolation remains mandatory in storage, repository methods, APIs, and UI DTOs.

## Roadmap

Next step: implement an RLS-safe Supabase review repository using authenticated user context, then add an authenticated read-only review list. Public approval/write paths remain out of scope until a later explicitly reviewed prompt.
