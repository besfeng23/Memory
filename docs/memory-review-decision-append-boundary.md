# Memory review decision append boundary

Review decisions are append-only records. The authenticated reviewer path appends a decision row and may move the review item status through the documented transition contract, but it does not edit candidate content, change namespace, delete items, or persist approved candidates into memory tables.

Approval only records a review decision and review state. Approval does not persist memory yet. Approved review item persistence remains a future controlled step behind internal/admin gates and is still not production memory persistence.

Namespace isolation remains mandatory. AU/story memory must never become real-life evidence. Real-life memory cannot enter AU unless explicitly fictionalized and reviewed.

The route mutation path is implemented as an injected/tested factory. Public defaults remain safely gated when authenticated repository wiring is unavailable. Client-supplied `user_id`/`userId` is rejected; authenticated user identity comes from server auth/repository context only.

This boundary introduces no model calls, retrieval, embeddings, pgvector, GPT Actions, MCP, service-role route activation, production memory writes, or `/api/memory/ingest` activation.
