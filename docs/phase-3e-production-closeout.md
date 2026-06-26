# Phase 3E Production Closeout Hardening

Phase 3E is the final proof layer before memory admin closure. It does not add new core memory functionality, public reads, writes, patching, deletion, model calls, embeddings, semantic retrieval, GPT Actions, or MCP.

## Current phase history

- Phase 3B: gated in-app memory browser proof was merged before this closeout phase.
- Phase 3C: browser closure hardening was merged before this closeout phase.
- Phase 3D: production verification route, DTO/loader, route guard contract, and safety regressions were merged before this closeout phase.
- Phase 3E: adds the production closure dashboard, complete runtime gate matrix, manual verification checklist, stricter close/no-close blocker logic, and release proof templates.

## Merged PRs

- PR #93: Phase 3B memory browser work.
- PR #94: Phase 3C memory browser closure hardening.
- PR #95: Phase 3D production verification route.

## Production URLs to verify

Replace the host with the deployed Vercel URL. Do not hardcode deployment URLs in source.

- `https://<deployment-host>/admin/memory/verification`
- `https://<deployment-host>/admin/memory/browser?namespace=real_life`
- `https://<deployment-host>/admin/memory/audit?namespace=real_life`
- `https://<deployment-host>/memory/browser`

## Required environment variables

- `PANDORA_ENABLE_PERSISTED_MEMORY_READ=true` for authenticated production read proof.
- `VERCEL_GIT_COMMIT_SHA`, `GIT_COMMIT_SHA`, or `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` for deployed commit proof.
- `VERCEL_ENV` and `VERCEL_URL` for deployment context proof where available.
- `PANDORA_SKILLS_COMMIT_SHA` and `PANDORA_SKILLS_PROOF_STATUS` if the owner/operator requires skills proof in the closure packet.

## Expected safe gate states

- `persistedMemoryReadEnabled`: enabled only for authenticated, namespace-scoped read proof.
- `adminPersistenceConsoleEnabled`: disabled for closure.
- `approvedReviewPersistenceEnabled`: disabled for closure.
- `operatorQaFlowEnabled`: disabled for closure.
- `ingestProductionWriteEnabled`: disabled for closure.
- `publicMemoryReadEnabled`: disabled for closure.
- `publicMemoryPersistenceEnabled`: disabled for closure.
- `modelCallsEnabled`: disabled for closure.
- `embeddingsEnabled`: disabled for closure.
- `semanticRetrievalEnabled`: disabled for closure.
- `gptActionsEnabled`: disabled for closure.
- `mcpEnabled`: disabled for closure.

## Expected auth behavior

- Admin memory routes require a Supabase operator/admin session.
- Unauthenticated visits to admin memory routes must show login or auth-required state.
- No persisted rows, proof data, or audit rows should render to unauthenticated users.
- User identity must be server-derived or RLS-derived; client-supplied user IDs are not trusted.

## Expected public redirect behavior

- `/memory/browser` redirects to `/admin/memory/browser?namespace=real_life`.
- No public persisted memory rows render on `/memory/browser`.
- No public memory audit or proof route is added for Phase 3E.

## Expected read-only behavior

- Admin verification, browser, and audit routes remain read-only.
- No mutation controls should appear.
- No write, patch, delete, batch append, model, embedding, retrieval, GPT Actions, or MCP controls should appear.
- No service-role client should be used by browser code.

## Manual verification steps

1. Confirm the deployed commit SHA matches the intended release commit.
2. Sign in with the operator/admin account.
3. Open `/admin/memory/verification` and capture the Phase 3E Closure Status section.
4. Confirm the runtime gate matrix shows persisted memory read enabled and all dangerous gates disabled.
5. Open `/admin/memory/browser?namespace=real_life` and confirm source/proof fields render as available or explicitly not configured/unavailable.
6. Open `/admin/memory/audit?namespace=real_life` and confirm audit proof renders as available or explicitly unavailable.
7. Open admin routes from an unauthenticated/private browser and confirm login/auth-required state.
8. Open `/memory/browser` and confirm it redirects to `/admin/memory/browser?namespace=real_life` without rendering rows publicly.
9. Confirm no mutation controls exist on verification, browser, or audit routes.
10. Record the result in `docs/templates/memory-production-release-proof.md`.

## Close/no-close decision criteria

Close only when all of these are true after deployment and owner/operator verification:

- Deployed commit proof is present.
- Authenticated operator/admin session is present.
- Persisted read gate is enabled for proof.
- Supabase/RLS read proof is available.
- Public memory read is disabled.
- Public memory persistence is disabled.
- Every dangerous runtime gate is disabled.
- Admin route guard expectations are present.
- Browser and audit route statuses are identifiable.
- Source/proof/audit statuses are explicit, not ambiguous.
- Manual production checklist passes.

If any item fails or remains unknown, the decision is **no-close**.

## Known limitations

- Codex cannot prove production deployment, production Supabase rows, or owner/operator browser behavior unless those results are provided or verified after deployment.
- Empty authenticated read results can prove the route and RLS-safe read path are reachable, but they do not prove specific production row content exists.
- This document does not claim production verification passed.

## Exact commands Codex ran

Record command results in the PR body. Expected closeout commands are:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Final recommendation format

Use this format in the release proof:

```text
Decision: close | no-close
Blockers: <exact blocker names or none>
Manual production verification performed by: <operator/reviewer>
Deployment URL: <Vercel URL>
Deployed commit SHA: <SHA>
Notes: <limitations or follow-ups>
```
