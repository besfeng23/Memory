# Pandora Operator Action Center

The Pandora Operator Action Center is a production-safe workflow foundation for authenticated operators. It lets the current server-derived Supabase user propose actions, dry-run safe verification work, inspect idempotency metadata, and review audit event history.

## What it does

- Creates bookkeeping rows in `pandora_operator_actions`.
- Creates audit/event rows in `pandora_operator_action_events`.
- Lists recent actions for the authenticated user only.
- Supports dry-run envelopes that summarize evidence and missing evidence.
- Records deterministic idempotency keys so repeated proposals return the existing action.

## What it explicitly does not do

- No model calls.
- No embeddings.
- No semantic retrieval enablement.
- No GPT Actions or MCP enablement.
- No destructive memory operations.
- No deletion, pruning application, merge, live distill, live profile rewrite, or production job execution.
- No mutation of `memory_events`, `memory_context_packs`, `memory_profiles`, or other core memory truth tables.
- No client-supplied `user_id` trust.

## Allowed action types

- `verify_namespace_invariants`
- `verify_pack_supersession`
- `check_retrieval_eval_status`
- `refresh_dashboard_snapshot`
- `prepare_distill_smoke_plan`

## Status lifecycle

Initial actions are `proposed` for `dry_run` mode or `queued` for `queued_only` mode. Dry-runs can move an action to `dry_ran` when no warnings are present or `blocked` when evidence is missing or warnings are returned. Operators can cancel an action before any future approval path. `completed` and `failed` exist for future bookkeeping but this PR does not add live execution.

## Why dry-run comes before live actions

Pandora memory changes must remain reviewed, source-backed, patch-backed, audit-backed, idempotent, and scoped to server-derived identity. Dry-run output gives operators a safe evidence packet before any future workflow can request explicit approval.

## How idempotency works

The service hashes the server-derived `userId`, action type, namespace, normalized payload, and mode. The database enforces `unique(user_id, idempotency_key)`, and the service returns an existing action instead of creating a duplicate.

## Why no core memory mutation is allowed in this PR

This PR only adds the operator workflow shell. Core memory truth tables continue to be controlled by existing reviewed persistence paths and RLS boundaries. The Action Center writes only bookkeeping and audit metadata about proposals, dry-runs, and cancellations.

## Future path to approved live actions

Future live actions would require a separate reviewed PR, explicit safety gates, protected dry-run output, human approval, route proof, database proof, and post-run verification. Until then, the dashboard exposes only safe proposal, dry-run, and cancellation workflows.
