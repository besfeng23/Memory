# Pandora Memory Engine — Codex Execution Plan

This document defines the recommended staged Codex build plan for **Pandora Memory Engine**.

The honest estimate for this system is:

| Build Level | Estimated Codex Tasks |
|---|---:|
| Rough prototype | 8-12 |
| Usable MVP | 18-25 |
| Serious production V1 | 30-45 |
| Polished full system | 50-70+ |

**Recommended execution target: 36 Codex tasks.**

This is not a one-prompt project. Pandora is not just a website. It is a real software product involving:

1. Next.js app
2. Supabase database
3. pgvector semantic search
4. OpenAI integration
5. memory extraction
6. memory validation
7. AU continuity engine
8. real-life memory isolation
9. GPT Actions schema
10. MCP server
11. RLS/security
12. audit logs
13. UI dashboards
14. tests
15. seed data
16. deployment

The danger is not code generation. The danger is letting an agent produce a fake-complete memory app with a nice UI and weak internals.

The correct order is:

1. README and architecture
2. schema
3. RLS
4. tests
5. memory contracts
6. engine
7. UI
8. hardening

---

## Target Plan: Pandora V1 in 36 Codex Tasks

| Phase | Task Count |
|---|---:|
| Foundation | 6 |
| Database + Security | 6 |
| Core Memory Engine | 6 |
| AU Continuity Engine | 7 |
| OpenAI / GPT Actions / MCP | 4 |
| UI | 4 |
| Testing + Deployment | 3 |
| **Total** | **36** |

---

## Phase 1 — Foundation

**Goal:** Build the skeleton correctly before touching memory logic.

**Task count:** 6

### Task 1 — Create Next.js + TypeScript + Supabase Project Structure

Build the base Next.js 15+ App Router project with TypeScript, Supabase client setup, server-only utilities, and clean folder structure.

Acceptance criteria:

- Next.js App Router works locally.
- TypeScript is strict.
- Supabase browser client and server client are separated.
- No service role key is used client-side.
- Basic health route exists.

### Task 2 — Add README, Architecture Docs, `.env.example`, and Coding Standards

Create documentation that Codex must obey during future tasks.

Acceptance criteria:

- README matches Pandora architecture.
- `.env.example` includes all required environment variables.
- `docs/architecture.md` explains the memory loop.
- `docs/security.md` explains RLS and key handling.
- `docs/coding-standards.md` defines naming, validation, logging, and test rules.

### Task 3 — Add Database Migration System

Set up Supabase SQL migrations or Drizzle migrations.

Acceptance criteria:

- Migration folder exists.
- Migration command is documented.
- Local database setup is documented.
- No tables are created manually outside migrations.

### Task 4 — Add Base UI Layout and Navigation

Create the operating-system style shell.

Acceptance criteria:

- App shell exists.
- Sidebar/top navigation exists.
- Dashboard placeholder exists.
- Light mode is default.
- UI is clean and serious, not sci-fi clutter.

### Task 5 — Add Auth and Session Structure

Create authentication/session helper functions.

Acceptance criteria:

- Server-side user resolution works.
- Protected routes reject unauthenticated users.
- API routes can require authenticated user.
- User ID is never trusted from client body when session exists.

### Task 6 — Add Shared Types and Zod Validators

Create shared TypeScript types and Zod schemas for namespaces, memory type, memory strength, and canon status.

Acceptance criteria:

- `real_life` and `au` namespaces are explicit enum values.
- Memory classification types are validated.
- API request schemas reject invalid namespace/type/status.
- Tests cover validators.

---

## Phase 2 — Database + RLS

**Goal:** Build the real product core. The database is the product.

**Task count:** 6

### Task 7 — Build Core Memory Schema

Create core memory tables.

Required tables:

- `users`
- `memory_namespaces`
- `memory_items`
- `memory_patches`
- `memory_sources`
- `prompt_logs`
- `retrieval_logs`
- `audit_logs`

Acceptance criteria:

- Every memory row has `user_id`.
- Every memory row has `namespace`.
- Patches are append-only.
- Memory items are not silently overwritten.

### Task 8 — Build Real-Life Memory Schema

Create real-life tables.

Required tables:

- `people`
- `relationships`
- `relationship_events`
- `business_entities`
- `business_deals`
- `promises`
- `decisions`
- `risks`
- `evidence_items`

Acceptance criteria:

- All tables include `user_id`.
- All relevant rows include source confidence.
- Evidence items support screenshots, files, URLs, text, and manual entries.
- Risks, promises, and decisions are timeline-compatible.

### Task 9 — Build AU / Story Memory Schema

Create AU tables.

Required tables:

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

Acceptance criteria:

- AU tables are namespace-isolated.
- Derived state tables are separate from append-only scene/patch history.
- Hard canon can be represented distinctly from soft canon.
- Retcons preserve original history.

### Task 10 — Add pgvector and Embedding Tables

Enable vector search.

Acceptance criteria:

- pgvector extension is enabled.
- `memory_embeddings` exists.
- Embeddings reference memory items or patches.
- Vector indexes exist.
- Namespace and user filters are required before vector ranking.

### Task 11 — Add RLS Policies

Enable Supabase row-level security.

Acceptance criteria:

- RLS is enabled on every user data table.
- Users can only read/write their own data.
- Service role policies are server-only.
- AU and real-life namespaces cannot cross-query.
- Tests prove namespace isolation.

### Task 12 — Add Seed Data

Create realistic seed data for development.

Acceptance criteria:

- Includes one real-life example flow.
- Includes one AU world.
- Includes character state, relationship state, scene history, consequence, and open thread.
- Seed data does not mix AU and real-life evidence.

---

## Phase 3 — Core Memory Engine

**Goal:** Build the machine: retrieve → reason → extract → validate → patch → audit.

**Task count:** 6

### Task 13 — Build Memory Ingest API

Route:

```text
POST /api/memory/ingest
```

Acceptance criteria:

- Accepts raw text or structured input.
- Requires namespace.
- Validates with Zod.
- Creates memory source records.
- Does not blindly create durable memory without extraction/validation.

### Task 14 — Build Memory Search API

Route:

```text
POST /api/memory/search
```

Acceptance criteria:

- Supports keyword search.
- Supports semantic search.
- Supports hybrid search.
- Requires namespace.
- Logs every retrieval.
- Never returns AU memory in real-life search.

### Task 15 — Build Embedding Pipeline

Add embedding generation and indexing.

Acceptance criteria:

- Server-side OpenAI key only.
- Embeddings generated for accepted memory items/patches.
- Failed embedding jobs are retryable.
- Embedding records keep source references.

### Task 16 — Build Memory Patch Writer

Route:

```text
POST /api/memory/patch
```

Acceptance criteria:

- Creates append-only patches.
- Does not overwrite existing memory directly.
- Requires classification, confidence, strength, source, and namespace.
- Creates audit log for every write.

### Task 17 — Build Memory Validation Layer

Route:

```text
POST /api/memory/validate
```

Acceptance criteria:

- Detects contradictions.
- Detects namespace contamination.
- Flags low confidence or missing source.
- AU contradictions become `retcon_candidate` when appropriate.
- Real-life uncertain claims remain uncertain.

### Task 18 — Build Memory Timeline Endpoint

Route:

```text
GET /api/memory/timeline
```

Acceptance criteria:

- Returns chronological memory events.
- Filters by namespace, type, person, business entity, AU world, or character.
- Includes patch history and source confidence.
- Excludes soft-deleted items by default.

---

## Phase 4 — AU Continuity Engine

**Goal:** Make AU memory behave like a continuity editor, character psychologist, and consequence tracker.

**Task count:** 7

### Task 19 — Build AU Worlds API

Routes:

```text
POST /api/au/worlds
GET /api/au/worlds/:id/context
```

Acceptance criteria:

- Creates AU worlds.
- Retrieves context pack.
- Context includes canon, characters, relationships, recent scenes, consequences, and open threads.
- Never queries real-life namespace unless explicitly allowed and fictionalized.

### Task 20 — Build Character Bible API

Create APIs and data access for AU character canon.

Acceptance criteria:

- Supports hard canon and soft canon.
- Tracks personality, motives, boundaries, behavior rules, and contradictions.
- Character state can evolve without mutating canon incorrectly.

### Task 21 — Build AU Relationship State API

Routes:

```text
GET /api/au/relationships/:id/state
```

Acceptance criteria:

- Tracks relationship metrics.
- Tracks trust, tension, intimacy, unresolved conflict, power balance, and recent changes.
- Derived state is updated from scene aftermath, not random overwrite.

### Task 22 — Build Scene Timeline API

Routes:

```text
GET /api/au/worlds/:id/timeline
```

Acceptance criteria:

- Shows scenes in order.
- Shows emotional turning points.
- Shows consequences and unresolved threads.
- Supports recent 3-5 scene retrieval for generation.

### Task 23 — Build Canon Guard

Route:

```text
POST /api/au/canon/check
```

Acceptance criteria:

- Checks proposed AU output against hard canon.
- Detects contradiction against character state.
- Detects contradiction against relationship state.
- Returns `allowed`, `canon_conflict`, or `retcon_candidate`.
- Never queries real-life namespace.
- Logs every canon check.

### Task 24 — Build Scene Aftermath Extractor

Route:

```text
POST /api/au/scenes/aftermath
```

Acceptance criteria:

- Extracts scene summary.
- Extracts emotional turning point.
- Extracts character state changes.
- Extracts relationship metric changes.
- Extracts consequences.
- Extracts unresolved threads.
- Extracts contradictions or retcon requests.
- Writes append-only patches.

### Task 25 — Build Retcon Manager

Route:

```text
POST /api/au/retcon
```

Acceptance criteria:

- Retcons do not erase original history.
- Retcons create explicit records.
- Retconned canon is marked as `retconned`.
- Hard canon changes require explicit retcon.
- Timeline can show before/after state.

---

## Phase 5 — OpenAI / GPT Actions / MCP Integration

**Goal:** Connect Pandora to model generation and external AI tools without surrendering memory control.

**Task count:** 4

### Task 26 — Add OpenAI Responses API Integration

Route:

```text
POST /api/ai/respond
```

Acceptance criteria:

- Uses server-side OpenAI key.
- Retrieves namespace-safe memory before generation.
- Applies correct prompt contract.
- Returns response plus memory delta candidates.
- Does not write model output directly to memory without validation.

### Task 27 — Add Prompt Contracts and Extraction System

Routes:

```text
POST /api/ai/extract-memory-deltas
POST /api/ai/summarize-memory
```

Acceptance criteria:

- Implements real-life memory contract.
- Implements AU memory contract.
- Implements extraction contract.
- Implements canon guard contract.
- Implements quality review contract.
- Extraction returns structured JSON validated by Zod.

### Task 28 — Add GPT Actions OpenAPI Schema

Route:

```text
GET /api/actions/openapi.json
```

Required action routes:

- `POST /api/actions/searchMemory`
- `POST /api/actions/addMemory`
- `POST /api/actions/getAUContext`
- `POST /api/actions/saveSceneAftermath`
- `POST /api/actions/checkCanon`
- `POST /api/actions/getRelationshipTimeline`

Acceptance criteria:

- OpenAPI schema is valid.
- Actions require authentication.
- Namespace is required.
- Actions cannot bypass validation/audit logging.

### Task 29 — Add Remote MCP Server Tools

Recommended path:

```text
mcp/server.ts
```

Required tools:

- `search_memory`
- `add_memory_patch`
- `get_au_context`
- `save_scene_aftermath`
- `check_canon`
- `get_relationship_state`
- `get_recent_scenes`
- `get_unresolved_threads`
- `get_real_life_evidence`

Acceptance criteria:

- Tools call the same server-side service layer as REST APIs.
- MCP cannot bypass namespace isolation.
- MCP cannot write without append-only patch and audit log.
- Secrets remain server-side only.

---

## Phase 6 — UI

**Goal:** Build a serious operating-system UI after the engine exists.

**Task count:** 4

Do not build a pretty shell first. That is ego pretending to be progress.

### Task 30 — Build Dashboard and Memory Search UI

Acceptance criteria:

- Dashboard shows memory counts by namespace/type/status.
- Search UI supports namespace filters.
- Results show confidence, strength, source, and canon status.
- Real-life and AU results are visually separated.

### Task 31 — Build Memory Item Detail and Timeline UI

Acceptance criteria:

- Item detail shows current derived view.
- Patch history is visible.
- Sources are visible.
- Audit trail is visible.
- Timeline supports filtering.

### Task 32 — Build AU World, Character Bible, Relationship State, and Scene Timeline UI

Acceptance criteria:

- AU world detail shows context pack.
- Character bible distinguishes hard canon from soft canon.
- Relationship state shows changes over time.
- Scene timeline shows consequences and open threads.

### Task 33 — Build Canon Conflict, Retcon, Risks/Promises, Settings, and Audit UI

Acceptance criteria:

- Canon conflicts are reviewable.
- Retcons are explicit and auditable.
- Risks and promises are visible in real-life memory.
- Settings include integrations and API keys.
- Audit logs are searchable.

---

## Phase 7 — Testing + Deployment

**Goal:** Make it real, not impressive-looking trash.

**Task count:** 3

### Task 34 — Add Unit and API Route Tests

Acceptance criteria:

- Unit tests cover validators, classification, retrieval, patch writing, and canon checking.
- API tests cover memory, AU, real-life, and actions routes.
- Tests run in CI.

### Task 35 — Add Security, RLS, and Contamination Tests

Acceptance criteria:

- Real-life query cannot retrieve AU memory.
- AU query cannot retrieve real-life evidence unless explicitly allowed and fictionalized.
- RLS prevents cross-user reads/writes.
- Service role key is never accessible client-side.
- Hard canon contradiction is blocked or classified as retcon candidate.

### Task 36 — Prepare Deployment Checklist and Fix Test Failures

Acceptance criteria:

- Production environment variables are documented.
- Supabase migration deployment is documented.
- Vercel deployment checklist exists.
- Known stubs are listed clearly.
- Tests pass or failing tests are documented with reason.

---


## Prompt 61 Update — Review Queue Storage/API/UI Foundation

- Review queue contract is complete as a no-write service boundary.
- Review storage/API/UI foundation has been added with a safe migration draft, repository contract, test-only in-memory repository, Supabase skeleton, disabled/read-only API stubs, and a review inbox UI shell.
- Production approvals and memory persistence remain disabled; `/api/memory/ingest` remains production-disabled.
- Next step: RLS-safe Supabase review repository implementation and authenticated read-only review list.

---

## Codex Prompt Format

Every Codex task should use this structure:

```text
Goal:
Build only this specific part.

Context:
Read README.md and docs/codex-execution-plan.md before coding. Obey the architecture, namespace isolation, append-only memory, RLS, and audit requirements.

Files to touch:
List exact folders/files.

Requirements:
Specific bullet points.

Acceptance criteria:
The task is done only if these tests/checks pass.

Do not:
List what it must not do.
```

---

## Example Codex Task Prompt

```text
Goal:
Build the AU canon guard.

Context:
Read README.md and docs/codex-execution-plan.md before coding. The AU canon guard must enforce hard canon, character consistency, relationship state, unresolved threads, and consequences. It must never query the real-life namespace.

Files to touch:
- lib/au/canon-guard.ts
- app/api/au/canon/check/route.ts
- lib/validation/schemas.ts
- tests/au-canon.test.ts

Requirements:
- Check proposed AU output against hard canon.
- Detect contradiction against character state.
- Detect contradiction against relationship state.
- Return `allowed`, `canon_conflict`, or `retcon_candidate`.
- Never query real_life namespace.
- Log every canon check.

Acceptance criteria:
- Unit tests prove AU cannot retrieve real-life memory.
- Hard canon contradiction is blocked.
- Retcon request is classified as `retcon_candidate`.
- No silent overwrite of canon.

Do not:
- Do not build UI in this task.
- Do not add unrelated routes.
- Do not bypass audit logging.
- Do not directly overwrite canon rows.
```

---

## Operating Rule

Use 36 Codex tasks as the main V1 execution plan.

- Use 18 only for a rushed MVP.
- Use 36 for the serious V1.
- Use 50-70+ for the polished full system.

The database, RLS, tests, and memory contracts must come first. UI comes after the engine.


## Prompt 62 Update — RLS-safe Review Queue Read-only Foundation

- Added active Supabase RLS tables for review queue items and append-only decisions.
- Added repository/mapper foundations for context-owned read/create review queue access.
- Added read-only route factory and safe disabled public route wiring.
- Review UI now targets UI-safe read-only DTOs and disabled backend state.
- Next step: review decision append RPC and controlled internal mutation path. Still not production memory persistence.

## Prompt 64 — Approved-review persistence preview

- Added approved-review persistence preview contracts, eligibility validation, append-only plan building, a disabled/internal route shell, repository interface contracts for future implementation, and review UI copy for a disabled persistence preview.
- The next step is an internal/admin-gated transactional persistence executor that can append source/item/patch/audit records behind explicit gates.
- This is still not production memory persistence: approved review items remain review records only, `/api/memory/ingest` remains production-disabled, and no model, retrieval, embedding, pgvector, GPT Actions, MCP, or Supabase memory writes are introduced.

## Prompt 65 — Internal approved-review memory persistence executor boundary

- Approved-review persistence preview is complete and remains no-write with `wouldPersist: false`.
- Added an internal executor boundary for approved-review memory persistence plans.
- Added a disabled-by-default public persist route stub; this is still not public production memory persistence.
- Added in-memory test repository support and a Supabase repository skeleton that does not perform live writes.
- Next step: implement a transactional Supabase RPC, for example `memory_execute_approved_review_persistence`, behind the explicit internal/admin gate.

## Prompt 66 — Transactional Supabase approved-review persistence RPC

- Approved-review persistence preview is complete.
- The internal executor boundary is complete.
- Added transactional Supabase RPC persistence behind the internal/admin gate.
- Public production persistence remains disabled, and `/api/memory/ingest` remains production-disabled.
- Next step: authenticated private admin UI or CLI-only persistence execution review.
- Still no public production persistence, model calls, retrieval, embeddings, pgvector, GPT Actions, or MCP.

## Prompt 67 — private admin persistence execution console

- Transactional Supabase RPC approved-review persistence is completed behind an internal gate.
- Added a private admin/test-only persistence console shell and route boundary for approved-review memory persistence.
- Public production persistence and `/api/memory/ingest` production writes remain disabled.
- Next step: authenticated read/search memory API for persisted memory, without activating public ingest.


## Prompt 68 — Authenticated persisted-memory read API

- Transactional persistence RPC completed.
- Private admin persistence console boundary completed.
- Authenticated persisted-memory read API/repository layer added for namespace-scoped, read-only access.
- Next step: persisted-memory browser UI and audit/detail pages.
- Still no semantic retrieval or ChatGPT memory context assembly.

## Prompt 69 — Persisted-memory browser UI

- Authenticated persisted-memory read API completed in Prompt 68.
- Persisted-memory browser UI added for read-only inspection of persisted memories, sources, patch history, and audit trail.
- Browser filtering is keyword-only and namespace-scoped; sensitive evidence is redacted by default.
- Next step: audit/detail refinement and basic operator QA flow.
- Still no semantic retrieval, embeddings, pgvector, model calls, GPT Actions, MCP, or ChatGPT context assembly.

## Prompt 70 — Internal operator memory QA flow

- Persisted-memory browser UI completed in Prompt 69 for read-only inspection.
- Added an internal/test-only operator QA flow contract, runner, readback verifier, disabled-by-default route boundary, safe DTO mapping, and admin QA console shell.
- The flow verifies review → decision → preview → internal-gated persistence → readback → browser/audit verification without enabling public production ingest or public persistence.
- Next step: authenticated session wiring and operator-safe live configuration.
- Still no semantic retrieval or ChatGPT context assembly.

## Prompt 71 — authenticated session and runtime gate wiring

- Operator QA flow is completed as an internal/test-only boundary.
- Authenticated server-derived session and runtime gate wiring were added for persisted-memory reads, the read-only browser, admin persistence console visibility, and operator QA visibility.
- Admin persistence and QA execution remain disabled by default behind explicit environment, internal header, namespace, and admin/operator gates.
- Next step: add operator-safe live configuration instructions and a deployment checklist.
- Still no semantic retrieval, embeddings, model calls, GPT Actions, MCP, or ChatGPT context assembly.

## Prompt 72 — Operator live readiness and gate validation

Completed authenticated session/runtime gates from the previous phase are now surfaced through operator readiness validation. This phase adds an operator readiness contract, runtime gate validator, redacted environment safety snapshot, read-only readiness API/UI, and deployment checklist.

Next step: operator-safe live read configuration and first manual dry-run using existing internal gates.

Still no semantic retrieval, embeddings, model calls, GPT Actions, MCP, or ChatGPT context assembly.

## Prompt 73 — Operator-safe live dry-run kit

- Operator readiness/gate validation is completed from the prior readiness surfaces.
- Added the operator live dry-run kit to validate server session, namespace, runtime gates, redacted environment snapshot, read APIs, browser readiness, admin console gate status, operator QA gate status, and audit/idempotency requirements.
- Next step: first manual operator workflow using the existing review queue and internal gates.
- Still no semantic retrieval, embeddings, pgvector, model calls, GPT Actions, MCP, or ChatGPT memory context assembly.

## Prompt 75 — First reviewed-memory fixture dry-run pack

- First manual operator workflow completed.
- Added a first reviewed-memory fixture dry-run pack with deterministic local/test-only fixtures, scenario contracts, expected receipts, an in-memory fixture repository, an operator harness, a verification script, an admin report shell, and operator documentation.
- Next step: live internal operator wiring checklist for one real reviewed item.
- Still no semantic retrieval or ChatGPT context assembly.

## Prompt 76 — Live internal one-item workflow wiring

- First reviewed-memory fixture dry-run pack completed.
- Live internal one-item workflow wiring added behind internal/admin/operator gates.
- Next step: perform one controlled operator execution and capture receipt/readback/audit proof.
- Still no semantic retrieval or ChatGPT context assembly.

## Prompt 77 — controlled one-item execution proof pack

- Live internal one-item workflow completed.
- One-item execution proof pack added for a controlled, operator-only proof layer around one prior approved-review memory append.
- Next step: controlled operator execution runbook for one real approved item.
- Still no semantic retrieval or ChatGPT context assembly.

## Prompt 78 — Controlled operator execution runbook

- Controlled one-item execution proof pack completed.
- Controlled operator execution runbook added for the first internal one-item approved memory append.
- Next step: perform one controlled operator append in internal mode and capture proof.
- Still no semantic retrieval or ChatGPT context assembly.

## Prompt 79 — First-live-append readiness lock

- Controlled operator execution runbook completed.
- First-live-append readiness lock added for final internal safety checks before the first real approved append.
- Next step: perform one controlled internal append and capture proof.
- Still no semantic retrieval or ChatGPT context assembly.
