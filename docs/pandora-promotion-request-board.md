# Pandora Promotion Request Board v1

Promotion requests are production-safe planning records created from approved shadow-pack preflights. They capture deterministic promotion and rollback plans for operator review, but they do not execute any promotion.

## Approval is not execution

Approving a promotion request only stores reviewer intent on `pandora_promotion_requests`. This PR does not add an execute route and does not mutate `memory_context_packs`, `memory_events`, `memory_profiles`, capture candidates, or pruning candidates.

## Promotion plan structure

Each request stores `promotion_plan` with `plan_version`, namespace, shadow/preflight/master ids, intended operation, deterministic future steps, required checks, blockers, and `execution_available: false`.

## Rollback plan structure

Each request stores `rollback_plan` with deterministic future rollback steps and `rollback_execution_available: false`.

## Status meanings

- `draft`: generated with no blockers; not submitted.
- `submitted`: ready for human review.
- `approved`: reviewer approved the request only; no promotion executed.
- `blocked`: request cannot proceed without changes.
- `archived`: retained for audit/history.

## Review workflow

1. Approve a shadow-pack preflight for promotion consideration.
2. Create/refresh a promotion request from the preflight.
3. Review promotion plan, rollback plan, risk snapshot, diff snapshot, warnings, and blockers.
4. Submit, save review notes, approve/block/needs changes, or archive.
5. Stop: no live promotion executor exists in this release.

## Manual smoke checklist

- Open `/pandora` while authenticated.
- Confirm the Promotion Request Board displays “Promotion request only — execution unavailable”.
- Create/refresh from an approved preflight.
- Submit and save review decisions.
- Confirm no execute-promotion route or button is present.
- Confirm dashboard warnings remain safe if the new tables are unavailable.

## What remains gated

Actual replacement of active master packs, archival of real master packs, master creation, semantic retrieval, embeddings, model calls, MCP, GPT Actions, and pruning remain gated.

## Future path

A future human-approved promotion executor would need separate review, protected dry-run output, explicit approval, invariant checks, audit writes, rollback validation, and post-run database verification.
