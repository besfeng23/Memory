# Phase 3F Vercel deployment recovery

Phase 3F adds deployment recovery proof and production verification sealing. It does not add memory features, public reads, writes, service-role usage, model calls, embeddings, retrieval, GPT Actions, or MCP.

## What happened

PR #97 merged Phase 3E code-side closeout work, but the Vercel preview/deployment was previously blocked by the account deployment quota error `api-deployments-free-per-day`. That means CI success and merge status are not production verification.

## Why CI success is not production verification

CI proves the repository checks passed for a commit. Production verification requires a deployed URL running the expected commit, an authenticated operator checking `/admin/memory/verification`, `/admin/memory/browser`, and `/admin/memory/audit`, and a recorded owner/operator sign-off.

## Retry after quota reset

1. Wait for the Vercel deployment quota to reset or move the project to an account/plan with available deployments.
2. Re-run the deployment for the intended release commit.
3. Record the deployed commit SHA and deployment URL from Vercel.
4. Configure proof env vars only after the deployed URL exists:
   - `PANDORA_EXPECTED_RELEASE_SHA=<intended commit SHA>`
   - `PANDORA_PRODUCTION_VERIFICATION_STATUS=pending` until manual checks pass
   - `PANDORA_PRODUCTION_VERIFICATION_REVIEWER=<operator>` only after review
   - `PANDORA_PRODUCTION_VERIFICATION_AT=<ISO timestamp>` only after review
5. Open `/admin/memory/verification` as an authenticated admin/operator and confirm Phase 3F reports the deployed SHA, expected SHA, URL proof, and exact blockers.

## What to verify after deployment

- `/admin/memory/verification` requires authentication and shows no persisted rows to unauthenticated users.
- `/admin/memory/browser?namespace=real_life` remains authenticated, namespace-scoped, read-only, source-backed, and patch-backed.
- `/admin/memory/audit?namespace=real_life` remains authenticated, namespace-scoped, and read-only.
- `/memory/browser` redirects to `/admin/memory/browser?namespace=real_life` and does not render public persisted rows.
- Runtime gates remain closure-safe: no public memory reads, no public persistence, no production ingest writes, no model calls, no embeddings, no semantic retrieval, no GPT Actions, and no MCP.
- Supabase RLS/user scoping is verified through the authenticated server-derived user context.

## Filling proof fields

Use `docs/templates/memory-production-release-proof.md` after manual verification. Copy the final close/no-close blockers from `/admin/memory/verification`. Do not mark `PANDORA_PRODUCTION_VERIFICATION_STATUS=verified` until the owner/operator has actually checked the deployed URL.

## Status distinctions

- **Code-side merge-safe**: repository tests/build pass and the change is safe to merge, but no deployed URL is proven.
- **Deployment-ready**: code is ready for Vercel deployment and expected release SHA is known.
- **Production-verified**: deployed URL, deployed SHA, expected SHA match, authenticated route checks, runtime gate checks, RLS checks, reviewer, and timestamp are recorded.
- **Closure-complete**: production is verified and `/admin/memory/verification` reports no close blockers.

## Rollback/no-close guidance

If deployment fails, SHA proof mismatches, route auth is loosened, a public read appears, a write endpoint appears, service role is used in browser code, runtime gates are force-enabled, RLS cannot be verified, or source/patch/audit proof is missing, record `no-close`, list exact blockers, and roll back or redeploy a corrected commit before attempting verification again.

This document does not claim deployment succeeded.
