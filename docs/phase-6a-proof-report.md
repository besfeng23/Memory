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
- `/api/operating/priority-lock`
- `/api/operating/raw-movement`
- `/api/operating/decision-gates`
- `/api/operating/obna`
- `/api/operating/obna/generate`

## Local verification commands

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
npm run db:lint
```

## Known limitations

- OBNA is deterministic and rule-based.
- Raw movement conversion is heuristic-based.
- Prediction and connector layers are not included.
- Autonomous actions are not included.
- Run local verification before merge.
