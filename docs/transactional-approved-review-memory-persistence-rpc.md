# Transactional approved-review memory persistence RPC

This PR adds the first controlled real persistence implementation for approved review items: the Supabase RPC `memory_execute_approved_review_persistence`.

The execution path remains internal/admin-gated. Public routes remain disabled by default, `/api/memory/ingest` remains disabled, and client-triggered memory persistence is not exposed.

## Safety properties

- All writes are append-only.
- The RPC uses `auth.uid()` and verifies the review item belongs to the authenticated user.
- Application code derives ownership from `RepositoryContext`; client-supplied `user_id` or `userId` is rejected.
- Source, item, patch, and audit rows are written transactionally.
- The review item is marked executed only after the transaction writes succeed.
- The idempotency key prevents duplicate persistence for repeated execution attempts.
- Every successful execution requires an audit log row.
- The implementation does not call OpenAI, model providers, embeddings, retrieval, pgvector, GPT Actions, or MCP.

## Namespace boundaries

AU/story memory cannot become real-life evidence. Real-life memory cannot enter AU unless it has been explicitly fictionalized and reviewed. The RPC rejects namespace mismatches and candidate text mutation.
