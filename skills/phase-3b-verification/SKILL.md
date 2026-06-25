# Phase 3B Verification Skill

Use this skill to verify the Phase 3B internal memory browser.

## Goal

Confirm `/admin/memory/browser` is live, authenticated, read-only, namespace-scoped, and proof-backed before Phase 3B is declared complete.

## Required route

Preferred route:

```text
/admin/memory/browser
```

Alternative route:

```text
/admin/memory/readback
```

## Acceptance criteria

Phase 3B can be closed only when all are true:

1. The route is deployed and reachable.
2. A logged-in Supabase session is required.
3. Unauthenticated access does not expose memory rows.
4. The route reads only the current user's memory rows through RLS or server-derived identity.
5. The route supports namespace scoping.
6. A known memory item can be read back.
7. Source proof is visible as summary/count.
8. Patch proof is visible as summary/count.
9. Audit proof is visible as summary/count.
10. The UI visibly confirms these remain disabled:
    - retrieval
    - MCP
    - model calls
    - embeddings
    - GPT Actions
    - public reads
    - public persistence
11. No write action is available on the page.
12. No operator token is required in the browser.

## Verification report format

Return:

- Route checked
- Auth result
- Namespace result
- Memory row result
- Source proof result
- Patch proof result
- Audit proof result
- Disabled gates result
- Verdict: complete / not complete

Do not close Phase 3B if production deployment is blocked by Vercel quota or auth cannot be verified.
