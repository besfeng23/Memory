# Pandora Protected Job Smoke Test

## Purpose

Safely test internal Pandora job endpoints without leaking tokens or mutating production unexpectedly.

## Applies to

- `/api/memory/jobs/daily-digest`
- `/api/memory/jobs/phase-5d-maintenance`
- `/api/admin/memory/phase-5d/status`
- Any future internal job route.

## Required sequence

1. Confirm endpoint and namespace.
2. Confirm token presence without printing it.
3. Test unauthenticated request first when useful; it should fail with 401/403.
4. Run authenticated request using token from environment only.
5. Use `dryRun:true` unless explicitly approved otherwise.
6. Return redacted JSON output only.
7. Verify no writes, deletes, pruning application, or destructive mutation occurred.

## Forbidden

- Do not paste tokens into chat or PRs.
- Do not echo the token.
- Do not use `dryRun:false` without explicit post-dry-run approval.
- Do not run broad jobs across both namespaces in one call.
- Do not suppress errors or claim success without response evidence.

## Dry-run output checklist

Confirm:

- `dryRun` is true.
- namespace is correct.
- rows evaluated are listed or summarized.
- proposed writes are only proposed.
- errors/blockers are explicit.
- no raw secret values appear.

## Completion standard

Report command intent, HTTP result, redacted response summary, mutation status, and next safe approval gate.
