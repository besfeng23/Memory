# RLS Policy Foundation

Pandora Memory Engine now has an initial row-level security policy foundation for the user-owned tables created by the core schema migration.

## Migration Files

The policy foundation is split across three SQL migrations:

```text
supabase/migrations/20260620000200_rls_policy_foundation.sql
supabase/migrations/20260620000210_rls_real_life_tables.sql
supabase/migrations/20260620000220_rls_au_tables.sql
```

## Current Policy Shape

Each user-owned table has:

- row-level security enabled
- row-level security forced
- owner-scoped read policy
- owner-scoped create policy

The policy condition is based on the authenticated Supabase user matching the row owner.

## Current Tables Covered

Core memory tables:

- `memory_items`
- `memory_sources`
- `memory_patches`
- `retrieval_logs`
- `prompt_logs`
- `audit_logs`

Real-life tables:

- `people`
- `relationships`
- `relationship_events`
- `business_entities`
- `business_deals`
- `promises`
- `decisions`
- `risks`
- `evidence_items`

AU/story tables:

- `au_worlds`
- `au_characters`
- `au_relationships`
- `au_scenes`
- `au_consequences`
- `au_open_threads`
- `au_rules`
- `au_character_states`
- `au_relationship_states`
- `au_retcons`
- `au_quality_reviews`

## What This Does Not Mean Yet

This does not make the memory engine live.

The following remain planned:

- memory ingest APIs
- memory search APIs
- service-layer validation
- append-only patch enforcement in code
- retrieval logging behavior
- audit logging behavior
- AU canon guard behavior
- pgvector retrieval
- OpenAI integration
- GPT Actions
- MCP server

## Important Boundary

The database policy layer protects row ownership. It does not replace the application service layer.

Future application code must still:

- derive `user_id` from the authenticated session
- never trust client-submitted `user_id`
- always filter by namespace
- validate all memory changes before storage
- write audit and retrieval logs
- avoid silent overwrite behavior

## Next Step

Prompt 9 should add typed database helpers or generated Supabase types without adding memory APIs yet.
