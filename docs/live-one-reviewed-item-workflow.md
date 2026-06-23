# Live one reviewed item workflow

This is the first live internal one-item workflow for the Pandora Memory Engine. It is internal/admin/operator only and persists at most one approved review item per execution.

The workflow requires an approved review item, an append decision, an eligible preview, an idempotency key, typed confirmation of `APPEND MEMORY`, browser/readback visibility, and audit verification before a receipt is produced.

It does not activate public persistence, production ingest writes, public reads, model calls, embeddings, semantic retrieval, GPT Actions, MCP, or ChatGPT context assembly. All persistence remains append-only.

AU/story memory cannot become real-life evidence. Real-life memory cannot enter AU unless explicitly fictionalized and reviewed.
