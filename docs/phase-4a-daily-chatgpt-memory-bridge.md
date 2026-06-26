# Phase 4A: Daily ChatGPT Memory Bridge and Learning Loop

Phase 4A adds the first practical bridge between everyday work and Pandora Memory: capture reviewable memory events, distill deterministic context packs, and serve compact context to ChatGPT through a secure API or copyable prompt.

## What this phase adds

- `memory_events` for real-world capture.
- `memory_context_packs` for daily, weekly, master, project, people, risk, and operating-rules summaries.
- `/api/memory/capture`, `/api/memory/events`, event status routes, `/api/memory/context`, and `/api/memory/distill`.
- `/admin/memory/bridge` for daily use.
- `/admin/memory/bridge/self-test` to avoid another long manual verification cycle.
- `public/pandora-memory-openapi.json` for Custom GPT Actions.

## Everyday ChatGPT use

Normal ChatGPT will not magically read Pandora. To use Pandora context, either copy the “Use this Pandora context for this conversation” prompt from `/admin/memory/bridge`, use a Custom GPT Action configured from the OpenAPI schema, or call the API from a trusted wrapper.

## Admin bridge workflow

1. Open `/admin/memory/bridge`.
2. Capture memory manually from a chat, project update, relationship observation, business decision, or operator note.
3. Generate a daily or master context pack.
4. Copy the context prompt into ChatGPT, or call `/api/memory/context` from a Custom GPT/agent.

## Required env vars

- `PANDORA_ENABLE_MEMORY_CAPTURE_API=true` to capture events.
- `PANDORA_ENABLE_MEMORY_CONTEXT_API=true` to serve compact context.
- `PANDORA_ENABLE_MEMORY_DISTILLATION=true` to generate packs.
- `PANDORA_ENABLE_CHATGPT_ACTION_BRIDGE=true` only when intentionally enabling Action usage.
- `PANDORA_MEMORY_BRIDGE_TOKEN` for bearer-token bridge calls.
- `PANDORA_MEMORY_BRIDGE_USER_ID` to bind bearer-token calls to a server-configured user id.

## Security model

All write/capture/distillation routes require an operator session or the configured bridge token. All data is namespace-scoped. Every write/capture/distillation is audited. Public reads, public writes, model calls, embeddings, semantic retrieval, GPT Actions by default, and MCP remain disabled.

## Self-test

Open `/admin/memory/bridge/self-test`. It reports usable/blocked, blockers, warnings, and next actions. By default it is non-mutating. Controlled test writes require `PANDORA_ENABLE_MEMORY_BRIDGE_TEST_WRITE=true`.

## Rollback

Disable `PANDORA_ENABLE_MEMORY_CAPTURE_API`, `PANDORA_ENABLE_MEMORY_CONTEXT_API`, `PANDORA_ENABLE_MEMORY_DISTILLATION`, and `PANDORA_ENABLE_CHATGPT_ACTION_BRIDGE`. Phase 3F read-only closure remains available / close when these gates are disabled.
