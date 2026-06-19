# Repository / Service Foundation

Pandora Memory Engine now includes a typed repository and service foundation. This is not a public API layer and it does not implement memory behavior yet.

## Files

```text
lib/db/repository-result.ts
lib/db/repository-context.ts
lib/db/repository-guards.ts
lib/db/repository-contracts.ts
lib/services/service-boundary.ts
```

## What Exists

The foundation provides:

- `RepositoryResult` success/error shape.
- Repository error codes for auth, namespace, validation, missing row, and database failures.
- `RepositoryContext` built from authenticated user identity plus namespace.
- Table and row namespace guards.
- Generic read/create repository contracts.
- Helper for attaching the authenticated owner to create values.
- Service boundary helper that prepares owner-bound insert values.

## Why This Exists

Future memory, AU, and real-life services need a shared boundary before any database operation happens.

That boundary must:

- require authenticated context
- use typed table names
- preserve real-life and AU namespace boundaries
- attach owner identity from server-side context
- avoid trusting caller-provided ownership fields
- return structured errors instead of throwing random exceptions

## What Does Not Exist Yet

This step does not add:

- public memory APIs
- live repository implementations that call Supabase
- memory ingest
- memory search
- append-only patch behavior
- retrieval logging behavior
- audit logging behavior
- pgvector
- OpenAI integration
- GPT Actions
- MCP server
- seed data
- fake app data

## Future Repository Rules

When repository implementations are added, they must:

1. Accept a `RepositoryContext`.
2. Derive owner identity from that context.
3. Filter by namespace where applicable.
4. Use typed table names from `lib/db/table-names.ts`.
5. Return `RepositoryResult`.
6. Preserve RLS boundaries.
7. Add tests for every new repository method.

## Next Step

Prompt 11 should add the first concrete server-side repositories for safe core tables, still without public memory APIs.
