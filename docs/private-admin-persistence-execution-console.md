# Private admin persistence execution console

This PR adds a private admin/test-only console shell and route boundary for approved-review memory persistence.

Public production persistence remains disabled. The public `/api/memory/ingest` route is not activated for production writes, and normal clients cannot trigger memory persistence.

Persistence execution requires an authenticated server-derived repository context, an internal/admin gate, explicit namespace, preview, and an idempotency key. Successful execution must create an audit trace with user, namespace, review item, decision, idempotency, preview fingerprint, append-only result, and gate result.

The UI is disabled by default and clearly states that public production persistence is disabled and execution is internal/admin-gated. Public admin route stubs do not wire service-role clients or live repositories by default.

No model calls, retrieval, embeddings, pgvector, GPT Actions, MCP, or provider calls are added. AU/story memory cannot become real-life evidence. Real-life memory cannot enter AU unless explicitly fictionalized and reviewed.
