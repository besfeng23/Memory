# API Contracts

This document lists the planned Pandora Memory Engine API surface and the current implementation status. It is a contract for future tasks, not an implementation.

## Status Legend

- **Implemented:** Route exists in the codebase and performs real behavior.
- **Stubbed:** Route exists but only returns placeholder behavior or does not perform the full contract.
- **Planned:** Route does not exist yet.

At this stage, only `GET /api/health` is implemented. All memory, AU, real-life, OpenAI, GPT Actions, and MCP routes are planned and must not be treated as live.

## Health Route

| Status | Method | Route | Purpose |
|---|---|---|---|
| Implemented | `GET` | `/api/health` | Foundation health check. Reports that the memory engine, database schema, and OpenAI integration are not implemented. |

## Memory Routes

| Status | Method | Route | Purpose |
|---|---|---|---|
| Planned | `POST` | `/api/memory/ingest` | Ingest raw text, files, or structured input into the memory pipeline. |
| Planned | `POST` | `/api/memory/search` | Search memory using keyword, semantic, or hybrid retrieval. |
| Planned | `POST` | `/api/memory/extract` | Extract durable memory candidates from conversation or content. |
| Planned | `POST` | `/api/memory/validate` | Validate memory deltas before patching. |
| Planned | `POST` | `/api/memory/patch` | Append a memory patch. Never overwrite silently. |
| Planned | `GET` | `/api/memory/timeline` | Return memory events over time. |
| Planned | `GET` | `/api/memory/item/:id` | Return one memory item with patches, sources, and audit trail. |

## AU Routes

| Status | Method | Route | Purpose |
|---|---|---|---|
| Planned | `POST` | `/api/au/worlds` | Create an AU world. |
| Planned | `GET` | `/api/au/worlds/:id/context` | Retrieve complete AU context pack. |
| Planned | `POST` | `/api/au/scenes/generate` | Generate a scene with canon guardrails. |
| Planned | `POST` | `/api/au/scenes/aftermath` | Save scene aftermath, deltas, and consequences. |
| Planned | `POST` | `/api/au/canon/check` | Check proposed content against canon. |
| Planned | `POST` | `/api/au/retcon` | Propose and apply controlled retcons. |
| Planned | `GET` | `/api/au/worlds/:id/timeline` | Return world scene timeline. |
| Planned | `GET` | `/api/au/characters/:id/state` | Return character derived state. |
| Planned | `GET` | `/api/au/relationships/:id/state` | Return relationship derived state. |

## Real-Life Routes

| Status | Method | Route | Purpose |
|---|---|---|---|
| Planned | `POST` | `/api/real/relationship/analyze` | Analyze real relationship history using real-life memory only. |
| Planned | `POST` | `/api/real/business/analyze` | Analyze business memory, entities, deals, promises, and risk. |
| Planned | `POST` | `/api/real/decision/log` | Log a real-world decision. |
| Planned | `POST` | `/api/real/risk/log` | Log a risk signal with severity and source. |

## OpenAI Routes

| Status | Method | Route | Purpose |
|---|---|---|---|
| Planned | `POST` | `/api/ai/respond` | Main AI response endpoint using retrieval and memory contracts. |
| Planned | `POST` | `/api/ai/retrieve-context` | Retrieve namespace-safe memory context. |
| Planned | `POST` | `/api/ai/extract-memory-deltas` | Extract structured durable memory deltas. |
| Planned | `POST` | `/api/ai/summarize-memory` | Summarize memory items, timelines, scenes, or relationships. |

## GPT Actions Routes

| Status | Method | Route | Purpose |
|---|---|---|---|
| Planned | `GET` | `/api/actions/openapi.json` | OpenAPI schema for Custom GPT Actions. |
| Planned | `POST` | `/api/actions/searchMemory` | Search memory from a GPT Action. |
| Planned | `POST` | `/api/actions/addMemory` | Add append-only memory patch from a GPT Action. |
| Planned | `POST` | `/api/actions/getAUContext` | Retrieve AU context pack. |
| Planned | `POST` | `/api/actions/saveSceneAftermath` | Save AU scene aftermath. |
| Planned | `POST` | `/api/actions/checkCanon` | Check canon conflicts. |
| Planned | `POST` | `/api/actions/getRelationshipTimeline` | Retrieve relationship timeline. |

## MCP Tools

The MCP server is planned and not implemented. MCP tools must call the same service layer as REST APIs once implemented and must never bypass namespace isolation, validation, append-only patching, retrieval logging, or audit logging.

| Status | Tool | Purpose |
|---|---|---|
| Planned | `search_memory` | Search namespace-isolated memory. |
| Planned | `add_memory_patch` | Add a validated append-only memory patch. |
| Planned | `get_au_context` | Retrieve an AU context pack. |
| Planned | `save_scene_aftermath` | Save AU scene aftermath. |
| Planned | `check_canon` | Check proposed AU content against canon. |
| Planned | `get_relationship_state` | Retrieve relationship derived state. |
| Planned | `get_recent_scenes` | Retrieve recent AU scenes. |
| Planned | `get_unresolved_threads` | Retrieve unresolved AU threads. |
| Planned | `get_real_life_evidence` | Retrieve real-life evidence only from the real-life namespace. |
