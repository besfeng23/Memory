# Pandora Promotion Executor v1

The promotion executor is the final, gated stage of the shadow-pack promotion chain:

Shadow Context Pack Lab → Shadow Pack Preflight → Promotion Request Board → **Promotion Executor**.

It turns a human-approved promotion request into an actual master context-pack swap — and
nothing else.

## Double gate

Execution refuses unless ALL of the following hold:

1. `PANDORA_ENABLE_CONTEXT_PACK_PROMOTION=true` (dangerous gate, defaults to false, optional —
   never a required provider env, so an unset value never triggers RED drift).
2. The promotion request is `approved` with `reviewer_decision=approved`.
3. A fresh plan recomputation (live preflight, shadow pack, and active master) has zero blockers.
   In particular: the preflight is still `approved_for_promotion`, risk is not `blocked`, the
   shadow pack is not rejected/archived, and the active master is still the exact pack recorded
   at approval time — if the master changed since approval, execution refuses and demands a new
   preflight + approval cycle.
4. The request body carries the explicit confirmation phrase `"PROMOTE"` (`"ROLLBACK"` for
   rollbacks).

## What execution does

Status-only and reversible, in this order:

1. Insert a new `memory_context_packs` row (`pack_type=master`, `status=active`) built from the
   reviewed shadow candidate payload.
2. Archive the previous active master(s) for the same `(user_id, namespace, pack_type)` —
   `status=archived`, never deleted. This preserves the one-active-master invariant.
3. Mark the promotion request `promoted`.
4. Record an execution row, execution events, a promotion-request event, and an `audit_logs`
   entry.

## What it never does

- Never deletes any row anywhere.
- Never touches `memory_events`, `memory_items`, `memory_profiles`, capture candidates, or
  pruning candidates.
- Never crosses namespaces (`real_life` promotion cannot touch `au` packs and vice versa).
- Never uses service-role/admin clients; all writes go through the authenticated server client
  under RLS with server-derived identity. Client-supplied `user_id` is rejected.

## Rollback

`POST /api/pandora/promotion-executions/[id]/rollback` (gated, confirmation `"ROLLBACK"`):
archives the promoted pack and restores the previous master to `active`. Also status-only.

## Routes

- `POST /api/pandora/promotion-requests/[id]/execution/dry-run` — pure compute, no writes,
  works with the gate off; returns plan, blockers, warnings, `gate_enabled`, `executable`.
- `POST /api/pandora/promotion-requests/[id]/execution` — gated execute.
- `GET /api/pandora/promotion-executions` — list own executions.
- `POST /api/pandora/promotion-executions/[id]/rollback` — gated rollback.

## Rollout sequence (per skill 07)

1. PR reviewed and merged (this feature must not be self-merged by its author).
2. Migration `pandora_promotion_executor` applied.
3. Production deployed READY.
4. Dry-run via the dry-run route on a real approved request; output reviewed.
5. Human sets `PANDORA_ENABLE_CONTEXT_PACK_PROMOTION=true` in the deployment env.
6. One controlled execution with confirmation phrase; post-run verification of the
   one-active-master invariant and audit trail.
7. Gate may be turned back off between promotions.

Until step 5, all UI banners saying "execution unavailable" remain accurate. When the gate is
enabled, update the Promotion Request Board banner copy in the same change.
