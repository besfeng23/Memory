# Memory Candidate Services

Pandora Memory Engine now includes internal memory candidate service functions that combine validation with safe core repositories.

This is not a public memory API and it is not the full memory engine.

## File

```text
lib/memory/services/candidate-service.ts
```

## What Exists

The candidate service provides:

- `prepareMemoryCandidate`
- `saveMemoryCandidate`

`prepareMemoryCandidate` validates an unknown payload against the service context, then converts it into typed insert values for future persistence.

`saveMemoryCandidate` uses safe core repositories to create a memory item and its source rows after validation succeeds.

## Guardrails

The service requires a `RepositoryContext` containing:

- authenticated owner id
- namespace
- optional request id

Validation checks happen before repository calls.

The service does not trust caller-provided owner identity. Owner identity comes from the repository context and is attached by the repository/service boundary.

## Source Handling

The service can save source rows after a memory item is created.

Source rows are associated to the created memory item id and written through the memory source repository.

## What This Does Not Add

This step does not add:

- public memory API routes
- OpenAI extraction
- pgvector retrieval
- memory search
- patch execution
- audit log writes
- retrieval log writes
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Important Limit

`saveMemoryCandidate` is internal-only. It is not exposed through a route.

Before public ingest exists, Pandora still needs:

1. audit/retrieval logging services
2. patch service logic
3. idempotency and transaction strategy
4. public route contracts
5. abuse and rate-limit boundaries

## Next Step

Prompt 14 should add audit and retrieval logging service functions, still without public routes.
