# Memory ingest internal write mode

The internal memory-ingest write-mode harness is a **test-only** bridge across the planned persistence flow:

1. persistence preflight,
2. write-plan builder,
3. transaction/RPC boundary validation, and
4. internal persistence executor.

It exists to prove that the internal boundary can be invoked end to end with fake injected repositories. It does **not** activate production ingest.

## Enablement

Internal write mode is enabled only when both conditions are true:

- `NODE_ENV === "test"`
- `PANDORA_ENABLE_MEMORY_INGEST_INTERNAL_WRITE_MODE === "true"`

If the flag is set outside `NODE_ENV=test`, the helper returns a blocked non-test state. The public `/api/memory/ingest` route remains disabled and must not depend on this helper.

## Persistence safety

The harness must never write to live Supabase. Tests use fake injected implementations of the memory-ingest persistence repository contract, and those fakes only record deterministic call logs and return deterministic IDs.

The harness must not instantiate service-role clients, use live Supabase credentials, call OpenAI, perform retrieval, add pgvector behavior, add GPT Actions, or add MCP integration.

## Future production boundary

A future production implementation must use the transaction/RPC boundary before any real persistence adapter writes. Multi-row memory ingest writes must be atomic, rollback-on-failure, and append-only.

Future writes must insert new source, item, patch, audit, and idempotency records. They must not silently overwrite, update, delete, replace, or upsert over existing memory state.

## Ownership boundary

The authenticated repository context is the ownership boundary. Persistence inputs must use `context.userId`; client-supplied `user_id` or `userId` metadata is ignored or blocked and can never override ownership.

## Namespace isolation

Namespace isolation is mandatory:

- `real_life` writes remain real-life scoped.
- `au` writes remain fictional/story scoped.
- AU/story data must never become real-life evidence.
- Cross-namespace plans must block before execution.

The internal harness keeps these namespace decisions explicit in preflight, write-plan, transaction validation, and execution results.
