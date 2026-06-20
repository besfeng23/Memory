# API Contracts

This document lists the planned Pandora Memory Engine API surface and the current implementation status. It is a contract for future tasks, not an implementation.

## Status Legend

- **Implemented:** Route exists in the codebase and performs real behavior.
- **Disabled Stub:** Route exists but returns `501 Not Implemented` and performs no live workflow.
- **Stubbed:** Route exists but only returns placeholder behavior or does not perform the full contract.
- **Planned:** Route does not exist yet.

At this stage, `GET /api/health`, `GET /api/session`, foundation Supabase Auth routes, and a disabled `/api/memory/ingest` harness are present. Memory ingest is not live. AU, real-life, OpenAI, GPT Actions, and MCP routes are planned and must not be treated as live.

## Foundation and Auth Routes

| Status | Method | Route | Purpose |
|---|---|---|---|
| Implemented | `GET` | `/api/health` | Public foundation health check. Reports auth/session structure status and that memory engine, database schema, and OpenAI integration are not implemented. |
| Implemented | `GET` | `/api/session` | Public-safe session status. Returns whether a user is authenticated and safe user metadata only; never returns tokens or raw sessions. |
| Foundation | `GET` | `/auth/login` | Supabase magic-link login page using only public browser-safe Supabase configuration. |
| Foundation | `GET` | `/auth/callback` | Exchanges a Supabase callback code for a server-managed session and redirects without logging tokens. |
| Foundation | `GET`/`POST` | `/auth/logout` | Signs out the current Supabase session server-side and redirects to login. |

## Health Route

| Status | Method | Route | Purpose |
|---|---|---|---|
| Implemented | `GET` | `/api/health` | Public foundation health check. Reports that auth/session structure is implemented and that memory engine, database schema, and OpenAI integration are not implemented. |

## Memory Routes

| Status | Method | Route | Purpose |
|---|---|---|---|
| Disabled Stub | `POST` | `/api/memory/ingest` | Returns `501 Not Implemented`. It does not run ingest, call models, retrieve context, or save records. |
| Planned | `POST` | `/api/memory/search` | Search memory using keyword, semantic, or hybrid retrieval. |
| Planned | `POST` | `/api/memory/extract` | Extract durable memory candidates from conversation or content. |
| Planned | `POST` | `/api/memory/validate` | Validate memory deltas before patching. |
| Planned | `POST` | `/api/memory/patch` | Append a memory patch. Never overwrite silently. |
| Planned | `GET` | `/api/memory/timeline` | Return memory events over time. |
| Planned | `GET` | `/api/memory/item/:id` | Return one memory item with patches, sources, and audit trail. |

## Future Memory Ingest Response Contract

`POST /api/memory/ingest` currently exists only as a disabled 501 harness. It must not become live until route-level auth, validation, transaction behavior, and audit behavior are ready.

When it is later implemented, its response must use this shape:

```json
{
  "ok": true,
  "namespace": "real_life",
  "memoryItem": {
    "id": "uuid",
    "memory_type": "observation",
    "title": "string",
    "body": "string",
    "strength": "medium",
    "confidence": 0.8,
    "canon_status": "draft",
    "source_summary": null,
    "metadata": {},
    "created_at": "timestamp",
    "updated_at": "timestamp-or-null"
  },
  "sources": [],
  "warnings": [],
  "idempotency": {
    "status": "completed",
    "record_id": "uuid"
  }
}
```

The route must not return raw Supabase errors, tokens, sessions, unfiltered owner ids, or unrelated namespace records.

The route should prefer exact readback rows for client-facing responses when database defaults or triggers matter.

Duplicate idempotent submissions should return a non-success conflict response unless a future replay-safe response cache is explicitly implemented.

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
