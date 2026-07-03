# Pandora Read-Only Action Runner

## Summary

The read-only action runner upgrades the Operator Action Center from proposals and dry-runs into approval-gated verification execution. It remains non-destructive: execution reads evidence and writes only action bookkeeping and action event rows.

## Lifecycle states

| State | Meaning |
| --- | --- |
| `proposed` | Operator created an idempotent safe action proposal. |
| `dry_ran` | Read-only dry-run evidence was generated. |
| `approved` | Operator approved read-only execution. |
| `executing` | Runner started an approved read-only verification routine. |
| `completed` | Runner stored a real read-only result. |
| `failed` | Runner stored loader failure warnings without fabricating success. |
| `cancelled` | Operator cancelled before terminal execution. |
| `blocked` | Reserved safety state for blocked workflows. |

## State transitions

`proposed -> dry_ran -> approved -> executing -> completed`

Additional allowed transitions: `proposed -> approved`, `proposed/dry_ran/approved -> cancelled`, and `executing -> failed`. Terminal states are immutable by the runner.

## Allowed read-only executions

- `verify_namespace_invariants`: summarizes namespace invariant verification.
- `verify_pack_supersession`: summarizes pack supersession verification.
- `check_retrieval_eval_status`: reports real eval/log evidence if present, otherwise unavailable/not run without fabricated accuracy.
- `refresh_dashboard_snapshot`: stores compact dashboard counts and warnings.
- `prepare_distill_smoke_plan`: prepares a plan only and never calls distill routes or mutates packs.

## Safety boundary

Live mutation remains gated. The runner does not call models, create embeddings, run semantic retrieval, distill, prune, merge, delete, or rewrite profiles. It does not insert, update, or delete core memory truth tables.

## `no_mutation_performed`

Completed and failed execution envelopes include `no_mutation_performed: true`. This means the runner wrote only `pandora_operator_actions` and `pandora_operator_action_events` rows and performed read-only checks against memory data.

## Idempotency

Proposal idempotency is deterministic per server-derived user id, action type, namespace, mode, and normalized payload. A repeated proposal returns the existing action row.

## Event history

Each state transition creates an event row with user scope, action id, event type, message, metadata, and timestamp. Dashboard cards show event previews and counts.

## Manual smoke-test checklist

1. Open `/pandora` while authenticated.
2. Propose each allowed action type for one namespace at a time.
3. Prepare a dry-run and verify warnings are visible.
4. Approve the action.
5. Execute approved read-only action.
6. Confirm the result shows `no_mutation_performed: true`.
7. Confirm no core memory rows changed.
8. Confirm cross-namespace data is not mixed.

## Future path to human-approved live actions

Any future live action needs a separate reviewed PR, protected dry-run output, explicit human approval, production readiness checks, database verification, and post-run audit evidence. This runner is not that live-mutation path.

## Shadow staging exception

The existing verification actions remain read-only. `prepare_shadow_context_pack` is the only staged write exception in this phase: after approval/execution it inserts a shadow candidate in `pandora_shadow_context_packs` and a matching shadow event. This is not a production context-pack promotion and cannot update `memory_context_packs`.
