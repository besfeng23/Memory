# Database Schema

Pandora Memory Engine now includes an initial Supabase SQL migration for the core database shape. This is a schema foundation only. It does not implement memory ingestion, retrieval, OpenAI calls, GPT Actions, MCP, service-layer behavior, pgvector retrieval, or UI-backed memory features.

## Migration

Current schema migration:

```text
supabase/migrations/20260620000100_core_database_schema.sql
```

The migration creates durable structure for:

- Core memory records.
- Memory sources.
- Append-only memory patches.
- Retrieval logs.
- Prompt logs.
- Audit logs.
- Real-life people, relationships, events, business entities, deals, promises, decisions, risks, and evidence.
- AU/story worlds, characters, relationships, scenes, consequences, open threads, rules, derived states, retcons, and quality reviews.

## Source of Truth

Supabase Postgres is the durable memory source of truth. ChatGPT/OpenAI built-in memory is not treated as authoritative memory for Pandora.

## Required Ownership Columns

Every user-owned table includes `user_id` referencing `auth.users(id)`.

Every memory-domain table includes `namespace` using `pandora_namespace`:

- `real_life`
- `au`

Real-life tables constrain namespace to `real_life`.
AU/story tables constrain namespace to `au`.

This supports strict separation between real-life and fictional AU/story continuity.

## RLS State

The migration enables Row Level Security on all user-owned tables, but it intentionally does not create RLS policies yet.

This means the schema is locked down until a future security migration adds explicit policies.

Prompt 8 should add tested RLS policies. Until those policies exist, application features must not treat database reads/writes as production-ready.

## pgvector State

The migration does not enable pgvector and does not create embedding tables or vector indexes.

Vector retrieval remains planned for a later migration. Keyword, semantic, and hybrid memory search must not be treated as implemented.

## Append-Only Structure

The schema includes:

- `memory_patches`
- `audit_logs`
- `retrieval_logs`
- `prompt_logs`

These tables prepare for append-only memory changes and auditable retrieval/write decisions. The service-layer behavior that enforces append-only writes is still planned.

## Explicit Non-Goals

This schema migration does not include:

- RLS policies.
- pgvector.
- Embedding tables.
- OpenAI API calls.
- Memory ingest/search/patch APIs.
- AU canon guard behavior.
- GPT Actions.
- MCP server.
- Fake users.
- Fake people.
- Fake AU worlds.
- Fake memory records.
- Fake audit logs.
- Seed data.

## Required Future Work

Before memory features can be considered live, future prompts must add:

1. RLS policies and tests.
2. Generated Supabase database types.
3. Service-layer repositories.
4. Memory validation and append-only patch logic.
5. Retrieval logging.
6. AU canon guard behavior.
7. Real-life evidence handling.
8. pgvector or other retrieval implementation.
