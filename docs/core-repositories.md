# Safe Core Repositories

Pandora Memory Engine includes concrete server-side repositories for selected safe core tables.

## File

```text
lib/db/core-repositories.ts
```

## Covered Tables

The repository foundation currently covers:

- `memory_items`
- `memory_sources`
- `memory_patches`
- `retrieval_logs`
- `prompt_logs`
- `audit_logs`
- `idempotency_records`

`memory_patches` was added only after memory patch validation and an internal append-only patch service existed.

`idempotency_records` was added only after transaction and idempotency scaffolding existed, and after the table received owner-scoped RLS.

## What the Repositories Do

Each repository supports:

- owner-scoped row lookup by id
- owner-scoped namespace-filtered listing
- owner-bound record creation
- structured repository errors
- default and maximum list limits
- injectable query client for tests

## Guardrails

Every repository operation requires a `RepositoryContext` containing:

- authenticated owner id
- namespace
- optional request id

Repositories filter by:

- `id` when reading one row
- `user_id`
- `namespace`

Create operations call the service boundary helper before writing so the owner id comes from server-side context rather than caller input.

## What This Does Not Add

This step does not add:

- public memory API routes
- memory ingest behavior
- memory extraction
- pgvector
- OpenAI calls
- GPT Actions
- MCP server
- fake seed data

## Future Rules

Future repositories must keep the same guardrails:

1. Accept a typed context.
2. Require authenticated owner identity.
3. Filter by owner.
4. Filter by namespace where applicable.
5. Return `RepositoryResult`.
6. Avoid public API exposure until service behavior is validated.
7. Add tests before merge.

## Current Limit

Generic repository calls are still not wrapped in a real database transaction layer. Public mutation routes should not be exposed until transaction behavior and idempotency conflict handling are implemented end-to-end.
