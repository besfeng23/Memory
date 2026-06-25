# Phase Status Ledger Skill

Use this skill when updating or auditing Pandora phase status.

## Goal

Keep the repo honest about what is complete, partial, blocked, or not started.

## Required truth model

Use these status labels:

- `complete` — merged, tested, deployed, and live-verified.
- `verified externally` — database/tool proof exists, but no live in-app route proof yet.
- `merged, awaiting deploy verification` — code is merged but production route is not live-verified.
- `partial` — some proof exists, but acceptance criteria are not met.
- `blocked` — a tool/platform/safety/quota blocker prevents completion.
- `not started` — no implementation proof exists.

## Pandora current baseline

- Phase 1 foundation shell: complete.
- Phase 2 first controlled live append proof: complete.
- Phase 3A receipt-backed readback console: complete/live.
- Phase 3B database proof: verified externally.
- Phase 3B in-app memory browser: merged, awaiting deploy verification.
- Phase 4 retrieval: not started.

## Checklist

1. Check recent merged PRs and commits.
2. Check deployment status.
3. Check live route verification.
4. Check Supabase database proof where applicable.
5. Update status docs only when evidence exists.
6. Keep `CLAUDE.md`, `AGENTS.md`, and any project status docs aligned.

## Output format

Return:

- Phase
- Current status
- Evidence
- Missing proof
- Next action

Never upgrade a phase to `complete` based only on planned work or PR description.
