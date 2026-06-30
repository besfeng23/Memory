# Phase 6A.2 — Signed-in Operating Smoke

Phase 6A.2 verifies the merged operating foundation in a real authenticated browser session.

## Goal

Prove that the signed-in user can create and persist the core Phase 6A operating records:

- priority lock
- work session
- OBNA
- raw movement item
- decision gate
- work session completion
- OBNA completion

## Routes

- `/operating/smoke` — signed-in smoke workflow page
- `/api/operating/smoke` — signed-in smoke readiness API

## Smoke workflow

1. Sign in.
2. Open `/operating/smoke`.
3. Click `Seed smoke workflow`.
4. Reload and confirm the checklist turns green.
5. Open `/operating` and confirm the same records are visible.
6. Return to `/operating/smoke`.
7. Click `Complete smoke workflow`.
8. Confirm the OBNA is completed and the work session is ended.

## Safety

The smoke workflow uses the same authenticated service layer as `/operating`.

- It does not use a service-role bypass.
- It does not write for another user.
- It writes to `real_life` only.
- It keeps Phase 6B, connectors, and prediction work parked.

## Acceptance

Phase 6A.2 is accepted when:

- CI passes.
- Vercel preview builds.
- `/operating/smoke` loads while signed out and shows the login state.
- A real signed-in browser session completes the workflow.
- The resulting records persist after reload.
