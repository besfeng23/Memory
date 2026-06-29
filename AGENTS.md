# Agent instructions for Codex

## Project

Pandora Memory Engine is a Next.js + Supabase memory system.

The system stores reviewed, source-backed, patch-backed, audit-backed memory across separated namespaces.

## Current phase status

- Phase 1 foundation shell: complete.
- Phase 2 first controlled live append proof: complete.
- Phase 3A receipt-backed readback console: live.
- Phase 3B database proof: verified externally.
- Phase 3B full in-app browser: not complete yet.
- Phase 5D code and migration may exist in the repo, but scoring is not complete until protected dry-run output is reviewed and controlled non-dry-run is explicitly approved.
- Retrieval, embeddings, GPT Actions, and MCP must not be claimed as enabled unless verified by deployed route proof, database proof, test output, or merged PR evidence.

## Prime directive

Be honest about what is shipped versus planned.

Do not claim Phase 3B, retrieval, MCP, embeddings, model calls, GPT Actions, memory scoring, pruning, or protected production jobs are complete unless there is deployed route proof, database proof, test output, or merged PR evidence proving it.

## Pandora skills pack

Codex must treat `.claude/skills/` as the repo operating procedures, even though they are stored under the Claude skills directory.

Always apply these first:

- `00-pandora-safety-gatekeeper`
- `01-pandora-secret-redaction`
- `02-pandora-namespace-isolation`

Apply specialized skills based on the task:

- protected jobs: `03-pandora-protected-job-smoke-test`
- Supabase migrations: `04-pandora-supabase-migration`
- RLS/security: `05-pandora-rls-security-review`
- Env Broker: `06-pandora-env-broker-drift`
- phase rollout: `07-pandora-phase-rollout-operator`
- PR review: `08-pandora-pr-review`
- verification: `09-pandora-ci-build-verifier`
- Phase 5D scoring: `10-pandora-memory-scoring-auditor`
- pruning: `11-pandora-pruning-review`
- retrieval: `12-pandora-retrieval-quality`
- contradictions: `13-pandora-contradiction-resolution`
- risky rollout: `14-pandora-rollback`
- privacy: `15-pandora-privacy-review`
- review UI: `16-pandora-review-queue-ux`
- architecture: `17-pandora-architecture-boundary`

The skills are instruction-only. They do not enable runtime behavior, apply migrations, deploy production, or mutate memory.

## Hard safety rules

Do not enable or add any of these unless explicitly instructed and reviewed:

- public memory reads
- public memory persistence
- production ingest writes unless reviewed
- model calls
- embeddings
- semantic retrieval
- GPT Actions
- MCP
- batch memory append
- automatic memory writes without review
- `dryRun:false` protected job execution
- pruning application/archive/delete behavior

## Memory namespace rules

Keep namespaces separated.

- `real_life` is for real user, business, relationship, legal, financial, project, and personal facts.
- `au` is for fictional/AU/story continuity only.

Never mix AU/story memory into real-life evidence.
Never store real-life claims as AU unless explicitly fictionalized and reviewed.

## Persistence rules

All memory writes must be:

- reviewed
- append-only
- source-backed
- patch-backed
- audit-backed
- idempotent
- tied to server-derived or RLS-derived user identity

Do not trust client-supplied user ids.

## Auth rules

Use Supabase Auth.
Anonymous login may exist only as a temporary operator-session shortcut.
Anonymous login must not bypass memory gates.

## Secrets

Never commit secrets.
Never print or request private operator tokens in source code, logs, comments, or docs.
Use environment variables only.
Do not read `.env`, `.env.*`, `.vercel/**`, `.supabase/**`, or `secrets/**` unless the user explicitly directs local setup and confirms no secrets will be exposed in output.

## Phase 3B target

Build a gated internal memory browser.

The preferred implementation is:

- route: `/admin/memory/browser` or upgrade `/admin/memory/readback`
- logged-in Supabase session required
- read-only
- user-scoped through RLS or server-derived user identity
- namespace-scoped
- source-backed
- patch-backed
- audit-backed
- no retrieval
- no embeddings
- no model calls
- no GPT Actions
- no MCP
- no public reads
- no public persistence

## Phase 5D execution rule

Phase 5D is not done merely because the migration exists.

Completion requires:

1. code merged
2. migration applied
3. production READY
4. protected dry-runs completed for `real_life` and `au`
5. dry-run output reviewed
6. explicit approval before any `dryRun:false` run
7. post-run database verification

Pruning remains review-only unless explicitly approved.

## Development checks

Before marking work complete, run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run env:policy
```

If a command cannot run due platform limits or unavailable dependencies, report the exact blocker and do not claim completion.

## Codex working style

- Prefer small, reviewable PRs.
- Explain changed files and why.
- Keep memory features gated until explicitly advanced to the next phase.
- Do not add broad public API endpoints for memory reads.
- Do not use service-role keys in browser code.
- Do not bypass RLS.
- Do not run production jobs with `dryRun:false` unless the user explicitly approves after reviewing dry-run output.
