# Claude instructions for Pandora Memory Engine

## Project

Pandora Memory Engine is a Next.js + Supabase memory system.

The product goal is to safely store, review, read back, and later retrieve structured memory across separated namespaces.

## Current phase status

- Phase 1 foundation shell: complete.
- Phase 2 first controlled live append proof: complete.
- Phase 3A receipt-backed readback console: live.
- Phase 3B database proof: verified externally.
- Phase 3B full in-app browser: not complete yet.
- Retrieval, embeddings, GPT Actions, and MCP are not enabled.

## Hard safety rules

Do not enable or add any of these unless explicitly instructed and reviewed:

- public memory reads
- public memory persistence
- production ingest writes
- model calls
- embeddings
- semantic retrieval
- GPT Actions
- MCP
- batch memory append
- automatic memory writes without review

## Memory namespace rules

Keep namespaces separated.

- `real_life` is for real user, business, relationship, legal, financial, project, and personal facts.
- `au` is for fictional/AU/story continuity only.

Never mix AU/story memory into real-life evidence.
Never store real-life claims as AU unless explicitly fictionalized and reviewed.

## Persistence rules

All memory writes must be:

- reviewed
- append-only
- source-backed
- patch-backed
- audit-backed
- idempotent
- tied to server-derived or RLS-derived user identity

Do not trust client-supplied user ids.

## Auth rules

Use Supabase Auth.
Anonymous login may exist only as a temporary operator-session shortcut.
Anonymous login must not bypass memory gates.

## Secrets

Never commit secrets.
Never print or request private operator tokens in source code, logs, comments, or docs.
Use environment variables only.

Important environment gates include:

- `PANDORA_ENABLE_PERSISTED_MEMORY_READ`
- `PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE`
- `PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE`
- `PANDORA_ENABLE_MEMORY_INGEST_PRODUCTION_WRITES`
- `PANDORA_ENABLE_PUBLIC_MEMORY_READ`
- `PANDORA_ENABLE_PUBLIC_MEMORY_PERSISTENCE`
- `PANDORA_ENABLE_MODEL_CALLS`
- `PANDORA_ENABLE_EMBEDDINGS`
- `PANDORA_ENABLE_SEMANTIC_RETRIEVAL`
- `PANDORA_ENABLE_GPT_ACTIONS`
- `PANDORA_ENABLE_MCP`

Dangerous gates default to false.

## Phase 3B target

Build a gated internal memory browser.

The preferred implementation is:

- route: `/admin/memory/browser` or upgrade `/admin/memory/readback`
- logged-in Supabase session required
- read-only
- user-scoped through RLS or server-derived user identity
- namespace-scoped
- source-backed
- patch-backed
- audit-backed
- no retrieval
- no embeddings
- no model calls
- no GPT Actions
- no MCP
- no public reads
- no public persistence

## Development checks

Before marking work complete, run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Response style for future agents

Be direct. Be honest about what is shipped versus only planned. Do not claim memory, retrieval, or MCP works unless verified by receipt, database proof, or deployed route proof.
