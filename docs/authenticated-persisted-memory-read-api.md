# Authenticated persisted-memory read API

This PR adds a read-only persisted memory API/repository layer for server-authenticated users. Reads are namespace-scoped and use server-derived identity only; route query/body `user_id` or `userId` values are rejected.

## Safety boundaries

- No public unauthenticated memory reads.
- No production writes and no `/api/memory/ingest` activation.
- No service-role client in public routes.
- No OpenAI or model provider calls.
- No embeddings, pgvector, semantic retrieval, GPT Actions, or MCP.
- No ChatGPT memory context assembly.
- Sensitive evidence blobs are redacted to previews in DTOs.
- AU/story memory is not real-life evidence.
- Real-life memory cannot enter AU unless explicitly fictionalized and reviewed.

## API surface

The route factory supports GET-only actions for listing/reading memory items and sources, plus item patches and audit events. Default route stubs return a wiring-safe disabled response until production auth and repository dependencies are injected.
