# Pandora Memory Engine — Roadmap

Last updated: 2026-07-15.

This is the committed roadmap. Earlier "roadmap Sprint 1" / "roadmap #9" references in commits
and PRs (#123, #124, #125) pointed at a numbered list that was never checked into the repo;
this document replaces it. Update this file when a stage lands, with evidence, per
`skills/phase-status-ledger`.

## Status snapshot (evidence-backed)

| Stage | Status | Evidence |
|---|---|---|
| Phase 1–3F (foundation → append proof → readback/browser/verification/closeout) | complete | merged PRs #93–#97, phase docs, production routes |
| Phase 4A proposals + daily ChatGPT bridge | complete | migrations `20260626040000`, `20260626041000` applied |
| Phase 4B Pandora MCP (13 tools, error envelope) | complete | PR #121, #125; `lib/services/pandora-mcp-server.ts` |
| Phase 4C adaptive memory intelligence | complete | migration `20260627040000` applied; PR #122 |
| Phase 5A autopilot capture / 5B candidate review / 5C compaction | complete | migrations applied; `/admin/memory/candidates`; supersede smoke 2026-07-03 |
| Phase 5D scoring/pruning | partial | code + migration `20260629000000` applied; dry-runs NOT yet run/reviewed |
| Phase 6A operating brain + 6A.2 smoke | complete | migration `20260701000000`; CI run 28467956363; Vercel READY |
| Phase 6B project context engine | complete | migration `20260701010000`; `/operating/projects` |
| Ops track: dashboard, verification console, action center, read-only runner | complete | PRs #131–#135 merged and deployed |
| Shadow context pack lab | complete | PR #136; migration applied 2026-07-15 (`20260715200130`) |
| Shadow pack preflight | complete | PR #137; migration applied 2026-07-15 (`20260715200149`) |
| Promotion request board (plans only, no execution) | complete | PR #138 merged 2026-07-15; migration `20260715200514`; Vercel READY on `22b8b1a` |

2026-07-15 operations note: five merged migrations had never been applied to production
(adaptive profile versioning columns, operator action center, runner statuses, shadow lab,
preflight). They were reviewed and applied on 2026-07-15 as versions `20260715200029`–
`20260715200149`, and the local files were renamed to match the ledger. Stale duplicate
PRs #96, #99, #118, #119 were closed with evidence comments.

## Next (queued, in order)

1. **Promotion executor** — the gated, human-approved path that promotes an approved shadow
   candidate to the active master. Chain: lab → preflight → request board (all live) →
   execution (NOT built). Requires its own PR, migration/policy review, dry-run proof, and
   explicit production approval. Until then every surface must keep saying
   "execution unavailable".
2. **Phase 5D closure** per the execution rule in `CLAUDE.md`: protected dry-runs for
   `real_life` and `au`, human review of dry-run output, explicit approval before any
   `dryRun:false` run, post-run database verification. Pruning stays review-only regardless
   (`lib/config/phase-5d-config.ts` hard-codes `review_only`).
3. **Checkpoint follow-ups** from `docs/pandora-production-checkpoint-2026-07-03.md`:
   the one-active-master-pack regression test and the mobile Queue-dot accessibility polish
   landed 2026-07-15; the live dashboard data route landed via PRs #131/#132.

## Gated ladder (requires explicit approval to start)

- **Phase 6C prediction** — blocked until project context is manually verified in production
  (guardrail in `docs/phase-6b-project-context-engine.md`). After that, in rough order of
  risk: Gmail/Calendar connectors, LLM-based prediction, intervention engine, autonomous
  actions.
- **Capability gates still off by design**: model calls, embeddings, semantic retrieval,
  GPT Actions enablement, public MCP expansion, batch/automatic memory writes, pruning
  execution. Each flips only with explicit instruction, review, and deployed proof.
- **Unbuilt tail of `docs/codex-execution-plan.md`** (the original 36-task V1 plan): AU
  continuity engine (canon guard, scene aftermath, retcon manager, character/relationship
  state APIs), real-life analyzers (`/api/real/*`), AI routes (`/api/ai/*`), full AU/canon
  UI. Never cancelled in writing — adopt into the ladder or park explicitly.

## Housekeeping decisions pending

- The production Supabase project also contains ~25 `plp_*` tables (bookings/resort) whose
  migrations are not in this repo. Decide whether to split that project into its own
  database per `17-pandora-architecture-boundary`.
