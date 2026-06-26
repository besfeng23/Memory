# Phase 3C Memory Browser Closure Checklist

## Production URLs to verify

- `/admin/memory/browser?namespace=real_life`
- `/admin/memory/browser?namespace=au`
- `/admin/memory/audit?namespace=real_life`
- `/memory/browser`

## Expected authenticated behavior

- Authenticated Supabase operator sessions can open the admin browser and audit viewer.
- Browser filters are URL query string backed, including `namespace`, `sourceType`, `createdFrom`, `createdTo`, and `proofStatus`.
- Every visible memory row should show namespace, source type, created/updated timestamps, audit reference, and patch/proof status when available.
- Missing provenance values render as `not available` or `not configured`, never as a blank proof.

## Expected unauthenticated behavior

- `/admin/memory/browser` and `/admin/memory/audit` show explicit authentication-required states and no persisted memory data.
- `/memory/browser` redirects to `/admin/memory/browser?namespace=real_life`.

## Read-only guarantees

- The browser and audit viewer expose no enabled edit, delete, write, persist, patch, execute, model, embedding, retrieval, GPT Actions, or MCP controls.
- The UI includes disabled mutation controls only as proof that mutation is unavailable.

## Unsafe gate status

- Unsafe production write gates remain disabled by default unless explicitly enabled by reviewed environment variables.
- Public memory reads and public persistence remain disabled by default.

## Audit proof status

- `/admin/memory/audit` reads audit rows through authenticated, namespace-scoped repository access.
- If `audit_logs` or required fields are unavailable, the route displays an explicit unavailable state with the missing expected fields.

## Source/patch proof status

- The browser displays compact provenance metadata for each row.
- Patch proof status is shown as available when patch rows are visible for the selected item; otherwise the UI says proof is not available.

## Known limitations

- Local verification cannot prove production RLS data ownership or deployed Supabase rows without production credentials.
- Skills proof values depend on deployment environment variables such as `VERCEL_GIT_COMMIT_SHA`, `PANDORA_SKILLS_COMMIT_SHA`, and `PANDORA_SKILLS_PROOF_STATUS`.
- Source/proof status filtering depends on matching database columns/metadata being available to RLS-scoped reads.

## Exact commands run

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

## Final close/no-close recommendation

Close Phase 3C after local checks pass and the owner manually verifies the production URLs above with an authenticated operator session and an unauthenticated browser session.
