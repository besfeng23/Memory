# Auth session and runtime gates

This PR adds server-derived auth/session context wiring for persisted-memory reads and operator surfaces.

- Read APIs require an authenticated server session and an explicit namespace. Client-supplied `user_id`/`userId` is rejected.
- Admin persistence execution and the operator QA flow remain internal/admin-gated and disabled unless all explicit environment, header, namespace, and operator/admin checks pass.
- Dangerous runtime gates default to `false`, including public memory reads, public persistence, ingest production writes, model calls, embeddings, semantic retrieval, GPT Actions, and MCP.
- `/api/memory/ingest` remains production-disabled; this work does not enable public writes or normal client-triggered persistence.
- Public routes must not use service-role credentials.
- This project still does not call OpenAI or any model provider, does not add embeddings, pgvector, semantic retrieval, GPT Actions, or MCP, and does not assemble ChatGPT memory context.
- AU/story memory cannot become real-life evidence.
- Real-life memory cannot enter AU unless explicitly fictionalized and reviewed.
