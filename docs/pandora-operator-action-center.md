# Pandora Operator Action Center

The Pandora Operator Action Center is a production-safe workflow for authenticated operators. It lets the current server-derived Supabase user propose actions, dry-run safe verification work, approve read-only execution, inspect idempotency metadata, and review audit event history.

## What it does

- Writes bookkeeping rows only in `pandora_operator_actions`.
- Writes audit/event rows only in `pandora_operator_action_events`.
- Lists recent actions for the authenticated user only.
- Supports dry-run and approved read-only execution envelopes.
- Records deterministic idempotency keys so repeated proposals return the existing action.

## What it explicitly does not do

- No model calls, embeddings, semantic retrieval enablement, GPT Actions, or MCP enablement.
- No destructive memory operations.
- No deletion, pruning application, merge, live distill, live profile rewrite, or production job execution.
- No mutation of `memory_events`, `memory_context_packs`, `memory_profiles`, `memory_capture_candidates`, `memory_pruning_candidates`, or other core memory truth tables.
- No client-supplied `user_id` trust.

## Allowed action types

- `verify_namespace_invariants`
- `verify_pack_supersession`
- `check_retrieval_eval_status`
- `refresh_dashboard_snapshot`
- `prepare_distill_smoke_plan`

## Status lifecycle

| From | To |
| --- | --- |
| `proposed` | `dry_ran`, `approved`, `cancelled` |
| `dry_ran` | `approved`, `cancelled` |
| `approved` | `executing`, `cancelled` |
| `executing` | `completed`, `failed` |
| `completed`, `failed`, `cancelled` | terminal |

Invalid transitions fail safely and do not create misleading completion states.

## Read-only execution

Approved actions execute verification loaders only. Results include `no_mutation_performed: true`, request/action identifiers, status, evidence summary, warnings, and execution timestamp.

## Idempotency and events

The service hashes the server-derived `userId`, action type, namespace, normalized payload, and mode. The database enforces `unique(user_id, idempotency_key)`. Every proposed, dry-run, approved, executing, completed, failed, and cancelled transition writes an event row.

## Shadow context-pack action

`prepare_shadow_context_pack` is available as a dry-run/queued-only operator action. Dry-run computes deterministic shadow candidate evidence without inserting a row. Approved execution writes only to the new shadow context-pack tables plus operator action events. It does not mutate core memory tables and does not promote to `memory_context_packs`.
