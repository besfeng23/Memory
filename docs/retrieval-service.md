# Internal Memory Retrieval Service Scaffold

Pandora Memory Engine now includes internal memory retrieval service scaffolding.

This is not semantic retrieval and it is not a public search API.

## File

```text
lib/memory/services/retrieval-service.ts
```

## What Exists

The retrieval service provides:

- `retrieveMemoryItems`
- `getMemoryItemById`

`retrieveMemoryItems` calls the safe memory item repository, then applies lightweight in-process filters.

`getMemoryItemById` delegates to the owner and namespace filtered repository lookup.

## Guardrails

Every retrieval operation requires a `RepositoryContext` containing:

- authenticated owner id
- namespace
- optional request id

The repository layer enforces owner and namespace filters before rows reach the service.

## Supported Internal Filters

The scaffold supports:

- memory type
- strength
- canon status
- active-only filtering
- lightweight title/body substring matching

This is intentionally simple scaffolding.

## Retrieval Logging

The service can optionally write a retrieval log through the internal logging service.

Retrieval log metadata explicitly marks:

- semantic search: false
- pgvector: false
- internal scaffold: true

## What This Does Not Add

This step does not add:

- public API routes
- semantic retrieval
- pgvector
- embeddings
- OpenAI calls
- production ranking
- memory ingest
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Next Step

Prompt 17 should add internal transaction and idempotency scaffolding before any public mutation route is exposed.
