# Phase 3D production verification

Phase 3D adds a read-only production verification console for closure hardening. It does not enable public memory reads, public persistence, unsafe writes, model calls, embeddings, semantic retrieval, GPT Actions, or MCP.

## Exact production URLs

Replace `<production-host>` with the deployed Vercel host.

- `https://<production-host>/admin/memory/verification`
- `https://<production-host>/admin/memory/browser?namespace=real_life`
- `https://<production-host>/admin/memory/audit?namespace=real_life`
- `https://<production-host>/memory/browser`

## Manual login test steps

1. Open `https://<production-host>/admin/memory/verification` in a private browser window.
2. Confirm unauthenticated access shows an authentication-required/login state and no persisted memory rows.
3. Log in with the reviewed Supabase operator account.
4. Re-open `/admin/memory/verification` and confirm the safety summary loads.
5. Open `/admin/memory/browser?namespace=real_life` and `/admin/memory/audit?namespace=real_life` from the same authenticated session.

## Expected auth behavior

- Admin memory routes require a Supabase-authenticated operator session.
- User identity must be server-derived from the session.
- Client-supplied `user_id`, `userId`, `client_user_id`, or `clientUserId` values must not be accepted.
- Unauthenticated sessions must see login/auth-required states, not memory rows.

## Expected public redirect behavior

- `https://<production-host>/memory/browser` redirects to `/admin/memory/browser?namespace=real_life`.
- The public route must not instantiate a Supabase read repository.
- The public route must not render persisted rows, source proof, patch proof, or audit proof.
- No public proof or audit route should exist for memory browser data.

## Expected read-only behavior

The admin browser, audit viewer, and verification route must remain read-only. They must not expose edit, delete, persist, execute, patch-write, model, embedding, semantic retrieval, GPT Actions, MCP, or public-read controls.

## Unsafe gate env variables to inspect

These should be absent or not set to `true` unless a separate reviewed production operation explicitly requires them:

- `PANDORA_ENABLE_MEMORY_INGEST_PRODUCTION_WRITES`
- `PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE`
- `PANDORA_ENABLE_PUBLIC_MEMORY_READ`
- `PANDORA_ENABLE_PUBLIC_MEMORY_PERSISTENCE`
- `PANDORA_ENABLE_MODEL_CALLS`
- `PANDORA_ENABLE_EMBEDDINGS`
- `PANDORA_ENABLE_SEMANTIC_RETRIEVAL`
- `PANDORA_ENABLE_GPT_ACTIONS`
- `PANDORA_ENABLE_MCP`

Useful proof-only values:

- `VERCEL_GIT_COMMIT_SHA` or `GIT_COMMIT_SHA`
- `VERCEL_ENV`
- `VERCEL_URL`
- `PANDORA_SKILLS_COMMIT_SHA`
- `PANDORA_SKILLS_PROOF_STATUS`

## Supabase/RLS proof expectations

- Reads are performed through the authenticated Supabase server client.
- Reads are scoped by server-derived user ID and namespace.
- Missing tables, missing proof fields, or RLS denial should display `unavailable` or `blocked`; the page must not crash.
- Browser proof should include source and patch fields where available.
- Audit proof should include audit route availability or an explicit unavailable state.

## Close/no-close decision criteria

Phase 3D can close after deployment only if:

- The deployed commit SHA is visible or otherwise captured in release proof.
- `/admin/memory/verification` loads for an authenticated operator.
- `/admin/memory/browser?namespace=real_life` and `/admin/memory/audit?namespace=real_life` remain authenticated and read-only.
- `/memory/browser` redirects to the admin browser and does not render rows publicly.
- Public reads and unsafe mutation gates are disabled.
- Source, patch, audit, and skills commit proof are available or explicitly recorded as not configured with a follow-up decision.

Do not close if public reads are enabled, unsafe write gates are enabled without review, admin routes expose mutation controls, RLS blocks expected operator reads without explanation, or deployed proof cannot be tied to a commit.
