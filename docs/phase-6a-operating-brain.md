# Phase 6A — Operating Brain Foundation

Phase 6A makes Pandora usable as an operating cockpit without claiming the full autonomous brain is live.

## Implemented in Phase 6A

- `work_sessions` table for declared goals, proof targets, and outcomes.
- `priority_locks` table for the current locked priority and blocked distractions.
- `raw_movement_items` table for messy notes before they become structured memory.
- `decision_gates` table for structured go/park/kill/rework decisions.
- `one_best_next_actions` table for rule-based OBNA.
- `/operating` dashboard route.
- `/api/operating/*` API routes.
- Rule-based OBNA generation.
- Review-first raw movement heuristics.

## Phase 6A.1 hardening

Phase 6A.1 tightens the merged foundation without moving into Phase 6B.

Added hardening:

- API 500 responses now return a sanitized public error while logging the internal error server-side.
- Update services strip immutable fields such as `id`, `user_id`, `namespace`, `created_at`, and `updated_at`.
- Creating a new active work session supersedes older active work sessions in the same namespace.
- Creating a new active priority lock supersedes older active priority locks in the same namespace.
- Creating/generating a new active OBNA supersedes older active OBNAs in the same namespace.
- `/operating` now has self-contained forms for:
  - priority lock creation
  - work session start/end
  - raw movement capture
  - decision gate creation
  - OBNA generation/completion
- Added OBNA lifecycle update route: `PATCH /api/operating/obna/[id]`.

## Not implemented in this phase

- No connector expansion.
- No Gmail or Calendar ingestion.
- No prediction engine.
- No autonomous actions.
- No LLM-based drift detector.
- No claim that Pandora is fully autonomous.
- No AU canon expansion.

## Manual QA

1. Open `/operating`.
2. Sign in if required.
3. Create a priority lock through the UI.
4. Start a work session through the UI.
5. Generate OBNA through the UI.
6. Mark OBNA complete through the UI.
7. Capture raw movement through the UI.
8. Create a decision gate through the UI.
9. End the work session through the UI.
10. Verify records persist after reload.
11. Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.

## Phase 6A done means

- Migration applies.
- RLS is enabled.
- APIs derive user ownership server-side.
- Dashboard uses real records or honest empty states.
- Dashboard can operate all Phase 6A primitives without manual API calls.
- Docs clearly mark prediction, connectors, and autonomous actions as future work.
