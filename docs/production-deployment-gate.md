# Production Deployment Gate

Production must deploy the latest `main` commit.

Required checks:

- `/api/health` returns 200.
- `/operating` returns 200 while signed out.
- `/operating/smoke` returns 200 while signed out.
- Signed-in QA can seed and complete the operating workflow.

Retest attempts:

- 2026-06-30T20:15:00Z
- 2026-06-30T20:20:00Z
