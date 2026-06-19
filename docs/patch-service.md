# Append-Only Memory Patch Service

Pandora Memory Engine now includes an internal patch service for validated memory patch candidates.

This is not a public route and it is not the full memory engine.

## File

```text
lib/memory/services/patch-service.ts
```

## What Exists

The patch service provides:

- `prepareMemoryPatch`
- `saveMemoryPatch`

`prepareMemoryPatch` validates an unknown patch candidate against the service context, then converts it into typed insert values.

`saveMemoryPatch` writes a memory patch row, then writes an audit log row.

## Guardrails

Every operation requires a `RepositoryContext` containing:

- authenticated owner id
- namespace
- optional request id

The service does not trust caller-provided owner identity. Owner identity is attached by the repository/service boundary.

The candidate namespace must match the context namespace.

## Patch Validation

Patch candidates are validated by the memory validation foundation.

Existing-memory changes require:

- reason
- before snapshot
- after snapshot

Initial-create patches require:

- after snapshot

## Audit Behavior

After a memory patch is written, the service records an audit log targeting the related `memory_items` row.

The audit log metadata includes:

- memory patch id
- patch type
- reason

## Important Limit

This service is not transactional yet. If a patch write succeeds and the audit write fails, the current foundation returns the audit error but does not roll back the patch row.

A future transaction strategy must resolve this before public mutation routes exist.

## What This Does Not Add

This step does not add:

- public API routes
- OpenAI calls
- pgvector retrieval
- memory search
- memory item update behavior
- full memory engine behavior
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Next Step

Prompt 16 should add internal memory retrieval service scaffolding that uses owner and namespace filters, still without pgvector or public routes.
