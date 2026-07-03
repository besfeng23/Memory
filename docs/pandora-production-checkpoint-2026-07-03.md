# Pandora production checkpoint — 2026-07-03

## Scope

This checkpoint records the verified production state after the Pandora retrieval/supersede and dashboard cleanup sequence.

## Landed PRs

- PR #127 — `Add retrieval evals and supersede old master packs on distill`.
  - Merge commit: `d15f609d6c0b7603acd199cfb9c2a2df78fac375`.
  - Added retrieval eval coverage, `createContextPack` supersede-on-distill, and the known-people whitelist design note.
- PR #128 — `Fix Pandora dashboard truth boundary`.
  - Merge commit: `9ef48cd98781157d2bdb37b8a528471da2ec4c16`.
  - Auth-gated `/pandora`, removed operational-looking fake claims/counts, and marked dashboard data as mock/backend pending.
- PR #129 — `Fix Pandora mobile nav label`.
  - Merge commit: `a8a0839bb4da28fcb4a022aa4f4485c7f7f72157`.
  - Fixed mobile nav active-state mismatch by aligning `Feed` with `Memory Feed` in mock nav data.

## Deployment status

- Vercel reported success for the PR #127 merge commit.
- Vercel reported success for the later PR #129 merge commit, which includes #127 and #128 on `main`.

## Supersede smoke evidence

Production Supabase project: `Memory` / `idmnxpjlqjwrymtpufpn`.

Read-only database checks on `public.memory_context_packs` and `public.audit_logs` show that the main user `64110799-da61-445d-a7b3-57f3d0c7e411` was distilled twice in both namespaces around `2026-07-03 18:23 UTC`:

### AU namespace

- First smoke pack: `e42b4173-e8a0-430a-acc9-c8a7ae94a890`.
  - `namespace = au`.
  - `pack_type = master`.
  - Final `status = archived`.
  - Created at `2026-07-03 18:23:15.265611+00`.
  - Updated to archived at `2026-07-03 18:23:44.353+00`.
- Second smoke pack: `7893c4b6-40f6-4487-8915-9a5994545ef1`.
  - `namespace = au`.
  - `pack_type = master`.
  - Final `status = active`.
  - Created at `2026-07-03 18:23:44.208354+00`.

### real_life namespace

- First smoke pack: `010e3a29-d2e5-45fb-a4d1-dc3b89065420`.
  - `namespace = real_life`.
  - `pack_type = master`.
  - Final `status = archived`.
  - Created at `2026-07-03 18:23:20.218058+00`.
  - Updated to archived at `2026-07-03 18:23:49.8+00`.
- Second smoke pack: `d7462945-1148-4738-8581-d9b292d2dcd9`.
  - `namespace = real_life`.
  - `pack_type = master`.
  - Final `status = active`.
  - Created at `2026-07-03 18:23:49.657227+00`.

## Final active-pack invariant

For user `64110799-da61-445d-a7b3-57f3d0c7e411`:

- `au` / `master` has exactly one active pack.
- `real_life` / `master` has exactly one active pack.
- Older same-user, same-namespace, same-`pack_type` master packs are archived, not deleted.
- The read-only grouping showed another active `real_life` master for user `83a07d75-6b1f-4d93-aded-65540c9f73f2`, so global active count is not expected to be one across all users. The invariant is per `(user_id, namespace, pack_type)`.

## Safety notes

- No destructive cleanup was performed during this checkpoint.
- No production rows were changed by the verification queries.
- Supersede remains status-only and reversible: older packs become `archived`; `memory_events` are not mutated.
- The dashboard remains a gated/mock shell until backend truth routes are wired.

## Remaining follow-ups

1. Build a real Pandora dashboard data route/server action that reads only authenticated, RLS/session-scoped truth from Supabase.
2. Add a regression test that fails when more than one active master pack exists per `(user_id, namespace, pack_type)` after distill.
3. Finish the minor mobile Queue-dot accessibility polish in `components/pandora/MobileBottomNav.tsx`.
4. Review stale open PRs #118/#119/#99/#96 separately; do not merge them blindly.
