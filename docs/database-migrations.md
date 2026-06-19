# Database Migration Workflow

Pandora Memory Engine uses the Supabase CLI migration workflow as the source of truth for database structure. This document prepares the workflow only; it does not create the production memory schema, RLS policies, pgvector extension, or seed data.

## Current Scope

This repository currently includes:

- `supabase/config.toml` for local Supabase CLI development.
- `supabase/migrations/` for versioned SQL migration files.
- `supabase/seed.sql` as a placeholder for future local development seed data.
- npm scripts that wrap common Supabase CLI commands.

The full memory schema, pgvector setup, RLS policies, and realistic seed data will be added in later Codex tasks.

## Required Tooling

Install the Supabase CLI before using the database scripts. The scripts assume the `supabase` command is available on your PATH.

Common setup:

```bash
npm install
supabase --version
```

If the CLI is not installed, follow the official Supabase CLI installation instructions for your operating system before running database commands.

## Local Migration Workflow

All database changes must be represented as migration files under `supabase/migrations/`.

Typical local flow:

1. Start local Supabase:

   ```bash
   npm run db:start
   ```

2. Create or edit a migration file in `supabase/migrations/`.

3. Reset the local database to replay migrations from scratch:

   ```bash
   npm run db:reset
   ```

4. Lint database changes:

   ```bash
   npm run db:lint
   ```

5. Regenerate local database types after schema migrations exist:

   ```bash
   npm run db:types
   ```

6. Stop local Supabase when finished:

   ```bash
   npm run db:stop
   ```

## Source of Truth Rule

Migration files are the source of truth. Manual SQL changes in the Supabase dashboard are not source-of-truth changes and must not be used as the only record of a schema update.

If SQL is tested manually during exploration, convert it into a reviewed migration file before treating it as implemented. Future Codex tasks must not depend on undocumented dashboard edits.

## Production and Preview Safety

Production database changes require review before they are applied. Do not casually run commands against production or link the local workspace to production unless the deployment task explicitly requires it.

Use separate database environments:

- **Local:** disposable Supabase CLI database for development and migration testing.
- **Preview/Staging:** hosted non-production database for deployment previews and integration checks.
- **Production:** real user data; migrations require review, backups, and rollback planning.

The `db:push` script is intentionally configured with `--dry-run` so it previews pending remote changes instead of applying them by default. Applying remote migrations must be an explicit, reviewed operation.

## Future Schema Requirements

When later tasks add user data tables, the migrations must enforce Pandora's memory safety rules:

- RLS must be added in migration files when user data tables are created.
- Every user-owned table must eventually include `user_id`.
- Every memory table must eventually include `namespace`.
- AU/story and real-life memory must be query-isolated.
- AU events must never be usable as real-life evidence.
- Real-life facts may only enter AU workflows when explicitly allowed and marked as fictionalized.
- Append-only patch tables and audit logging must preserve history.

## pgvector

Do not enable pgvector in this task. The pgvector extension, embedding tables, vector indexes, and namespace-first vector retrieval rules will be added in a later migration task.

## What Not To Do Yet

Do not create these objects in the current migration setup task:

- `memory_items`
- `memory_patches`
- `people`
- `au_worlds`
- other production memory tables
- RLS policies
- pgvector extension
- fake users or fake memory seed rows
- memory APIs or OpenAI calls
