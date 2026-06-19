# Pandora Memory Engine

Production-grade Memory Operating System for personal AI, real-life continuity, business intelligence, relationship history, and AU/story canon management.

> **Source of truth:** Pandora Memory Engine uses its own Supabase Postgres database as the durable memory store. ChatGPT/OpenAI built-in memory is **not** treated as the source of truth.

---

## Status

This repository is the planned production home for **Pandora Memory Engine**.

Current implementation status:

| Area | Status |
|---|---|
| Architecture specification | Defined in README and docs |
| Database model | Core schema migration implemented; RLS policies pending |
| RLS/security model | RLS enabled in schema; policies pending implementation |
| Auth/session structure | Foundation implemented |
| Next.js App Router app | Foundation implemented |
| OpenAI Responses API integration | Required, pending implementation |
| Embedding pipeline | Required, pending implementation |
| AU continuity engine | Required, pending implementation |
| Real-life memory engine | Required, pending implementation |
| GPT Actions API | Required, pending implementation |
| MCP server | Optional, pending implementation |

Do not treat any route, table, or feature listed below as complete until the implementation exists in the codebase.

## Documentation

Future Codex tasks must follow these operating documents:

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Auth and session boundary](docs/auth-session.md)
- [Coding standards](docs/coding-standards.md)
- [Environment](docs/environment.md)
- [Database migrations](docs/database-migrations.md)
- [Database schema](docs/database-schema.md)
- [UI foundation](docs/ui-foundation.md)
- [API contracts](docs/api-contracts.md)
- [Memory contracts](docs/memory-contracts.md)
- [Testing](docs/testing.md)
- [Codex execution plan](docs/codex-execution-plan.md)

These documents are authoritative for namespace isolation, append-only patches, UI honesty, server-only secrets, validation, audit logging, and planned-vs-implemented API status.

---

## What Pandora Does

Pandora Memory Engine improves every AI interaction through a controlled memory loop:

```text
USER PROMPT
  -> classify namespace and intent
  -> retrieve relevant memories
  -> retrieve canon / relationship state / recent scenes for AU
  -> generate response with OpenAI Responses API
  -> extract memory deltas
  -> validate deltas against canon, safety, and source rules
  -> save append-only memory patches
  -> update derived state
  -> log retrieval and write decisions
```

Pandora is designed for two strictly separated memory domains:

1. **Real-Life Memory**
   - Real people
   - Business history
   - Relationship signals
   - Promises
   - Risks
   - Evidence
   - Decisions
   - Source confidence

2. **AU / Story Memory**
   - Fictional alternate-universe continuity
   - World canon
   - Character bibles
   - Relationship state
   - Scene history
   - Consequences
   - Open threads
   - Retcons

### Non-Negotiable Isolation Rule

Real-life memory and AU/story memory must never contaminate each other.

- AU events must never be used as real-life evidence.
- Real-life facts may only be referenced inside AU if explicitly allowed and marked as fictionalized.
- Every memory row must include `user_id` and `namespace`.
- Every query must be namespace-isolated.
- Every write must be append-only and auditable.

---

## Core Stack

- **Framework:** Next.js 15+ App Router
- **Language:** TypeScript
- **Database:** Supabase Postgres
- **Vector Search:** pgvector
- **ORM / SQL:** Drizzle ORM or Supabase SQL migrations
- **AI Runtime:** OpenAI Responses API
- **Embeddings:** OpenAI embeddings or compatible provider
- **Validation:** Zod
- **Security:** Supabase RLS policies
- **Auditability:** Append-only audit logs
- **Optional Integrations:**
  - Remote MCP server for ChatGPT, Codex, Cursor, and agent tools
  - GPT Actions-compatible REST API for Custom GPT usage

---

## Memory Classification

Every extracted memory must be classified before storage.

### Memory Types

- `observation`
- `user_preference`
- `soft_canon`
- `hard_canon`
- `contradiction`
- `retcon_candidate`
- `real_life_fact`
- `business_fact`
- `relationship_signal`
- `risk_signal`

### Memory Strength

- `low`
- `medium`
- `high`
- `locked`

### Canon Status

- `draft`
- `soft_canon`
- `hard_canon`
- `retconned`
- `disputed`

---

## Prompt Contracts

Pandora uses explicit prompt contracts so memory behavior stays controlled, auditable, and predictable.

### `REAL_LIFE_MEMORY_CONTRACT`

```text
You are analyzing real-world information. Use only real-life memory namespace. Do not use AU events as evidence. Prioritize exact dates, source confidence, promises, risks, decisions, and consequences. If uncertain, mark uncertainty.
```

### `AU_MEMORY_CONTRACT`

```text
You are continuing or analyzing fictional AU/story memory. Use only AU namespace unless explicitly allowed. Preserve hard canon. Characters must behave consistently. Every scene must create or resolve consequence. Do not flatten characters into user wish fulfillment.
```

### `MEMORY_EXTRACTION_CONTRACT`

```text
Extract only durable memory. Do not save every sentence. Classify memory type, namespace, strength, confidence, source, and canon status. Flag contradictions. Recommend patch, but do not hard-lock unless appropriate.
```

### `CANON_GUARD_CONTRACT`

```text
Before generating AU output, check against hard canon, recent scenes, character state, relationship state, unresolved threads, and consequences. If a prompt requires contradiction, label it as retcon_candidate.
```

### `QUALITY_REVIEW_CONTRACT`

```text
After each AU output, grade continuity, character consistency, consequence progression, emotional realism, and future usefulness. Save improvement notes as user preference or quality memory only if durable.
```

---

## Required Database Tables

### Core Tables

- `users`
- `memory_namespaces`
- `memory_items`
- `memory_embeddings`
- `memory_patches`
- `memory_sources`
- `retrieval_logs`
- `prompt_logs`
- `audit_logs`

### Real-Life Tables

- `people`
- `relationships`
- `relationship_events`
- `business_entities`
- `business_deals`
- `promises`
- `decisions`
- `risks`
- `evidence_items`

### AU / Story Tables

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

---

## Suggested Database Principles

### Append-Only Memory

Pandora must not overwrite memory items directly.

Instead:

1. Create a `memory_item` for the durable concept.
2. Add `memory_patches` for every change, correction, contradiction, retcon, or confidence update.
3. Update derived state tables only after the patch is accepted.
4. Preserve the patch history forever unless an explicit admin hard-delete occurs.

### Soft Delete First

Deletion should mark rows as inactive or deleted.

Hard delete should be reserved for explicit admin operations and must be recorded in `audit_logs`.

### Source Confidence

Every real-life memory should carry a source reference when possible:

- screenshot
- email
- document
- user statement
- conversation turn
- URL
- uploaded file
- manual admin entry

---

## Security Requirements

- Supabase RLS enabled on every user data table.
- `user_id` required on every memory row.
- `namespace` required on every memory row.
- AU and real-life namespaces must be query-isolated.
- Supabase service role key must never be exposed client-side.
- OpenAI API key must remain server-side only.
- Every write must create an `audit_logs` row.
- Every retrieval must create a `retrieval_logs` row.
- No silent memory overwrite.
- Soft-delete by default.
- Explicit admin hard-delete only.

---

## Required API Routes

### Memory Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/memory/ingest` | Ingest raw text, files, or structured input into the memory pipeline. |
| `POST` | `/api/memory/search` | Search memory using keyword, semantic, or hybrid retrieval. |
| `POST` | `/api/memory/extract` | Extract durable memory candidates from conversation or content. |
| `POST` | `/api/memory/validate` | Validate memory deltas before patching. |
| `POST` | `/api/memory/patch` | Append a memory patch. Never overwrite silently. |
| `GET` | `/api/memory/timeline` | Return memory events over time. |
| `GET` | `/api/memory/item/:id` | Return one memory item with patches, sources, and audit trail. |

### AU Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/au/worlds` | Create an AU world. |
| `GET` | `/api/au/worlds/:id/context` | Retrieve complete AU context pack. |
| `POST` | `/api/au/scenes/generate` | Generate a scene with canon guardrails. |
| `POST` | `/api/au/scenes/aftermath` | Save scene aftermath, deltas, and consequences. |
| `POST` | `/api/au/canon/check` | Check proposed content against canon. |
| `POST` | `/api/au/retcon` | Propose and apply controlled retcons. |
| `GET` | `/api/au/worlds/:id/timeline` | Return world scene timeline. |
| `GET` | `/api/au/characters/:id/state` | Return character derived state. |
| `GET` | `/api/au/relationships/:id/state` | Return relationship derived state. |

### Real-Life Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/real/relationship/analyze` | Analyze real relationship history using real-life memory only. |
| `POST` | `/api/real/business/analyze` | Analyze business memory, entities, deals, promises, and risk. |
| `POST` | `/api/real/decision/log` | Log a real-world decision. |
| `POST` | `/api/real/risk/log` | Log a risk signal with severity and source. |

### OpenAI Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/ai/respond` | Main AI response endpoint using retrieval and memory contracts. |
| `POST` | `/api/ai/retrieve-context` | Retrieve namespace-safe memory context. |
| `POST` | `/api/ai/extract-memory-deltas` | Extract structured durable memory deltas. |
| `POST` | `/api/ai/summarize-memory` | Summarize memory items, timelines, scenes, or relationships. |

### GPT Actions Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/actions/openapi.json` | OpenAPI schema for Custom GPT Actions. |
| `POST` | `/api/actions/searchMemory` | Search memory from a GPT Action. |
| `POST` | `/api/actions/addMemory` | Add append-only memory patch from a GPT Action. |
| `POST` | `/api/actions/getAUContext` | Retrieve AU context pack. |
| `POST` | `/api/actions/saveSceneAftermath` | Save AU scene aftermath. |
| `POST` | `/api/actions/checkCanon` | Check canon conflicts. |
| `POST` | `/api/actions/getRelationshipTimeline` | Retrieve relationship timeline. |

---

## Remote MCP Server Tools

The optional MCP server should expose these tools:

- `search_memory`
- `add_memory_patch`
- `get_au_context`
- `save_scene_aftermath`
- `check_canon`
- `get_relationship_state`
- `get_recent_scenes`
- `get_unresolved_threads`
- `get_real_life_evidence`

Recommended location:

```text
mcp/server.ts
```

The MCP server must use server-side credentials only and must never expose Supabase service keys or OpenAI API keys to clients.

---

## AU Continuity Engine

The AU engine behaves like a continuity editor, character psychologist, and consequence tracker.

### Before AU Generation

Retrieve:

- world canon
- character bible
- relationship state
- recent 3-5 scenes
- unresolved threads
- prior consequences
- user AU preferences
- forbidden contradictions

### After AU Generation

Extract:

- scene summary
- emotional turning point
- character state changes
- relationship metric changes
- new consequences
- unresolved threads
- canon changes
- user taste signals
- contradictions or retcon requests

### AU Rules

- Canon is layered: draft, soft canon, hard canon, retconned, disputed.
- Retcons are allowed only if explicitly marked and audited.
- Characters should not reset emotionally between scenes.
- Relationship state must evolve based on consequences.
- New scenes must reference prior unresolved threads when relevant.

---

## Implementation Warning

Do not build this as a generic notes app.

The system must behave as a controlled memory engine with:

- strict namespace isolation
- append-only memory patches
- retrieval logs
- audit logs
- evidence/source confidence
- AU canon guardrails
- real-life uncertainty handling
- server-side secrets only

If a feature cannot meet these requirements yet, it must be labeled as planned or stubbed, not implemented.
