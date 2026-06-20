# Memory ingest route test mode

`POST /api/memory/ingest` remains production-disabled. The route still returns the disabled/not-implemented contract in normal operation and must not be treated as live memory ingest.

## Controlled internal write harness path

The route exposes a strictly controlled test-only path that can call the internal write harness. It is available only when all of the following are true:

- `NODE_ENV === "test"`
- `PANDORA_ENABLE_MEMORY_INGEST_ROUTE === "true"`
- `PANDORA_ENABLE_MEMORY_INGEST_INTERNAL_WRITE_MODE === "true"`
- the request includes `x-pandora-test-ingest-mode: internal-write-harness`
- tests inject a fake `MemoryIngestPersistenceRepository` through the route handler factory

If any condition is missing, the internal write harness is blocked and no persistence repository method is called.

## Dependency boundary

The app route uses `createMemoryIngestRouteHandler` with safe production defaults. It resolves the authenticated user from server auth and does not create a persistence repository, Supabase service-role client, OpenAI client, retrieval client, pgvector integration, GPT Action, or MCP integration.

Tests may construct the route handler with fake injected repositories. Those fakes record deterministic calls only and must never use live Supabase credentials or write to a real database.

## Ownership and namespace safety

The authenticated repository context is the ownership boundary. The route rejects client-supplied `user_id` or `userId`; user ownership must come only from server auth/repository context.

Namespace isolation is mandatory:

- `real_life` requests remain scoped to `real_life`.
- `au` requests remain fictional/story scoped.
- AU/story data must never become real-life evidence.
- Namespace mismatch must block before execution.
- Writes are append-only by design; silent overwrites are not allowed.

## Explicit non-goals

This test mode does not add or enable:

- production memory ingest
- live Supabase writes
- service-role route clients
- model calls
- retrieval
- pgvector
- GPT Actions
- MCP
- seed or fake production rows
