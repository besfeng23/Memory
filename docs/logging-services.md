# Internal Logging Services

Pandora Memory Engine now includes internal logging service functions for retrieval logs, prompt logs, and audit logs.

This is still not a public API surface. These functions are internal building blocks for later memory workflows.

## File

```text
lib/memory/services/logging-service.ts
```

## What Exists

The logging service provides:

- `prepareRetrievalLog`
- `preparePromptLog`
- `prepareAuditLog`
- `writeRetrievalLog`
- `writePromptLog`
- `writeAuditLog`

The prepare functions convert internal service inputs into typed insert values.

The write functions persist through safe core repositories.

## Guardrails

Every write requires a `RepositoryContext` containing:

- authenticated owner id
- namespace
- optional request id

The service does not trust caller-provided owner identity. The owner id is attached by the repository/service boundary.

All logs are namespace-scoped using the context namespace.

## Retrieval Logs

Retrieval logs capture:

- query text
- filters
- requested limit
- returned memory item ids
- metadata

They do not perform retrieval. They only record retrieval attempts after a later retrieval service exists.

## Prompt Logs

Prompt logs capture:

- route name
- model name
- request hash
- response hash
- metadata

They do not call any model and do not store raw prompt or response text.

## Audit Logs

Audit logs capture:

- action
- target table name
- target record id
- before snapshot
- after snapshot
- metadata

They do not enforce append-only patch semantics yet.

## What This Does Not Add

This step does not add:

- public API routes
- OpenAI calls
- pgvector retrieval
- memory search
- patch execution
- full memory engine behavior
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Next Step

Prompt 15 should add an internal append-only patch service that validates patch candidates and writes memory patches plus audit logs, still without public routes.
