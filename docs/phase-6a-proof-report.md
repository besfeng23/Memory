# Phase 6A Proof Report

## Summary

This branch adds the Phase 6A Operating Brain Foundation: work-session anchor, priority lock, raw movement inbox, decision gates, rule-based OBNA, API routes, and the `/operating` dashboard.

## Migration

- `supabase/migrations/20260701000000_phase_6a_operating_brain.sql`

## UI

- `/operating`

## APIs

- `/api/operating/work-sessions/current`
- `/api/operating/work-sessions`
- `/api/operating/work-sessions/[id]`
- `/api/operating/work-sessions/[id]/end`
- `/api/operating/priority-lock`
- `/api/operating/priority-lock/[id]`
- `/api/operating/raw-movement`
- `/api/operating/raw-movement/[itemId]`
- `/api/operating/decision-gates`
- `/api/operating/decision-gates/[gateId]`
- `/api/operating/obna`
- `/api/operating/obna/generate`

## CI verification

GitHub Actions run `28467956363` passed on commit `fd70919dff59e2431d8cac2d20ab2fad6b540497`.

Passed steps:

- Install dependencies
- Env Broker policy
- Typecheck
- Lint
- Test
- Build

Vercel deployment also reported success for the same commit.

## Known limitations

- OBNA is deterministic and rule-based.
- Raw movement conversion is heuristic-based.
- Prediction and connector layers are not included.
- Autonomous actions are not included.
- This is Phase 6A foundation, not the full autonomous Pandora brain.
