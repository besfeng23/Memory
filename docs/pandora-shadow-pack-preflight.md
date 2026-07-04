# Pandora Shadow Pack Diff + Promotion Preflight

Preflight is a review-only comparison between a staged `pandora_shadow_context_packs` candidate and the current active `memory_context_packs` master for the same server-derived user and namespace.

Approved-for-promotion is **not promotion**. It records reviewer intent for a future human-approved promotion system and never writes `memory_context_packs`, `memory_events`, `memory_profiles`, capture candidates, or pruning candidates.

## Deterministic diff rules

The service normalizes summary, source event counts, active master id, recent summaries, open-loop count, needs-review count, evidence summary, and candidate payload keys. It reports added, removed, changed, and unchanged keys plus numeric deltas.

## Risk rules

Blocked: no active master, or namespace mismatch. High: source event delta over 500 or removed keys. Medium: more than 8 changed keys or open-loop delta over 20. Low: active master exists, no removed keys, and changed keys are at or below 8. Empty recent summaries and missing evidence summaries become warnings, never fake green evidence.

## Workflow

1. Create or refresh a preflight for a known shadow pack.
2. Review diff, blockers, warnings, and deterministic risk.
3. Save reviewer notes and mark needs changes, approved for future promotion, or blocked.
4. Archive stale preflights.

## Manual smoke checklist

- Authenticated list returns only the current user's preflights.
- `user_id` in query/body is rejected.
- Create/refresh writes only preflight and preflight event rows.
- Approved-for-promotion does not mutate active master packs.
- UI contains the preflight-only banner and no live-promotion buttons.

## Future gated path

Actual promotion remains a separate, human-approved system after low-risk reviewed preflight evidence is available.

## Promotion Request Board v1 boundary

Approved shadow-pack preflights can now be used to create or refresh promotion requests for human review. These requests store deterministic promotion and rollback plans, but approval does not execute promotion and does not mutate production `memory_context_packs` or core memory truth tables.
