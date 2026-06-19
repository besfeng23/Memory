# Database Types

Pandora Memory Engine now includes a TypeScript database type foundation aligned to the current Supabase schema migrations.

## Files

```text
lib/supabase/database.types.ts
lib/db/table-names.ts
lib/db/namespaces.ts
```

## What Exists

`lib/supabase/database.types.ts` defines:

- shared JSON and timestamp types
- enum types for namespace, memory type, memory strength, canon status, evidence source type, and risk severity
- row types for core memory tables
- row types for real-life tables
- row types for AU/story tables
- a Supabase-compatible `Database` type
- reusable `PublicTableName`, row, create, and patch helper types

`lib/db/table-names.ts` defines stable table groups:

- core tables
- real-life tables
- AU/story tables
- all Pandora tables

`lib/db/namespaces.ts` defines helper functions for expected namespace checks.

## Typed Supabase Clients

The browser and server Supabase clients are now parameterized with the local `Database` type.

This gives future repository and service layers typed access to table names and row shapes before memory APIs are implemented.

## Important Limits

This is still a foundation step.

It does not implement:

- memory APIs
- service-layer repositories
- memory ingest
- memory search
- append-only patch behavior in code
- retrieval logging behavior in code
- audit logging behavior in code
- pgvector
- OpenAI integration
- GPT Actions
- MCP server

## Source of Truth

The SQL migrations remain the source of truth for the database structure.

When the schema changes, regenerate or update `lib/supabase/database.types.ts`, then update tests to confirm table coverage and namespace boundaries.

## Next Step

Prompt 10 should add repository/service foundations that use these types without exposing memory APIs yet.
