# Phase 6A — Operating Brain Foundation

Phase 6A makes Pandora usable as an operating cockpit without claiming the full autonomous brain is live.

## Implemented in this phase

- `work_sessions` table for declared goals, proof targets, and outcomes.
- `priority_locks` table for the current locked priority and blocked distractions.
- `raw_movement_items` table for messy notes before they become structured memory.
- `decision_gates` table for structured go/park/kill/rework decisions.
- `one_best_next_actions` table for rule-based OBNA.
- `/operating` dashboard route.
- `/api/operating/*` API routes.
- Rule-based OBNA generation.
- Review-first raw movement heuristics.

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
3. Create a priority lock through the API.
4. Start a work session through the UI.
5. Generate OBNA through the UI.
6. Capture raw movement through the API.
7. Create a decision gate through the API.
8. End the work session through the API.
9. Verify records persist after reload.
10. Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.

## Phase 6A done means

- Migration applies.
- RLS is enabled.
- APIs derive user ownership server-side.
- Dashboard uses real records or honest empty states.
- Docs clearly mark prediction, connectors, and autonomous actions as future work.
