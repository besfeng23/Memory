# First manual operator memory workflow

This PR adds a controlled first manual operator memory workflow for Pandora Memory Engine. It is an internal/admin-gated path for an authenticated operator to select an approved review item, build a preview, confirm execution, execute through the existing approved-review persistence executor boundary, read back memory, verify browser visibility, verify audit, and produce a safe receipt.

The workflow requires all of the following before execution: authenticated server session, internal/admin/operator capability, explicit allowed namespace, readiness pass, live dry-run pass, approved review item, append-only decision, valid preview, idempotency key, typed confirmation `APPEND MEMORY`, internal runtime gates, and the internal header `x-pandora-internal-persistence-mode: approved-review-executor`.

Default public route behavior remains disabled. Public persistence remains disabled. Production ingest writes remain disabled. There are no model calls, embeddings, pgvector, semantic retrieval, GPT Actions, or MCP integrations. All persistence remains append-only and must flow only through the approved-review executor dependency, never through UI writes, public routes, or `/api/memory/ingest`.

Receipts include fingerprints instead of raw sensitive identity or idempotency data. Memory text, evidence, env values, secrets, service-role details, and raw errors are redacted from DTOs. Receipt and audit verification are required.

AU/story memory cannot become real-life evidence. Real-life memory cannot enter AU unless explicitly fictionalized and reviewed.
