# Safe Core Repositories

Pandora Memory Engine now includes concrete server-side repositories for selected safe core tables.

## File

```text
lib/db/core-repositories.ts
```

## Covered Tables

The repository foundation currently covers:

- `memory_items`
- `memory_sources`
- `retrieval_logs`
- `prompt_logs`
- `audit_logs`

`memory_patches` is intentionally excluded from this first repository set. Patch behavior needs stricter validation and append-only rules before it should receive a concrete repository.

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
- memory validation
- append-only patch behavior
- retrieval logging behavior
- audit logging behavior
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

## Next Step

Prompt 12 should add memory validation contracts and service-layer validators before any public memory ingest or patch route is exposed.
