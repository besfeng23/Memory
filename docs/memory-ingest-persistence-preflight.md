# Memory Ingest Persistence Preflight

The persistence preflight layer is a readiness check for future Supabase-backed memory writes. It prepares the ingest path to validate ownership, namespace boundaries, and required write targets before any persistence implementation is allowed.

## Current behavior

This layer is readiness-only:

- It does **not** write memory rows.
- It does **not** call OpenAI or any other model provider.
- It does **not** perform retrieval.
- It does **not** create retrieval logs.
- It does **not** activate the production `/api/memory/ingest` route.

The public ingest route remains production-disabled. Test mode may surface the preflight result through the existing dry-run candidate path, but that dry-run path remains no-write and no-model.

## Ownership boundary

Future writes must use the authenticated server-side repository context as the ownership boundary. Client-supplied `user_id` or `userId` values in request metadata/body are not trusted and must never determine row ownership.

Preflight reports the server-authenticated `userId` it would use later and explicitly marks `wouldUseClientUserId: false`.

## Namespace isolation

Namespace isolation is mandatory for all future persistence:

- `real_life` memory cannot consume AU/story evidence.
- `au` content must remain fictional and story scoped.
- No cross-namespace persistence is allowed.

A future writer must block namespace mismatches between authenticated repository context and parsed request data before any write target is touched.

## Future append-only writes

Future real writes must remain append-only by design. The preflight advertises that future behavior with `wouldUseAppendOnlyPatch: true` and required write targets such as:

- `memory_items`
- `memory_sources`
- `memory_patches`
- `audit_logs`

No silent overwrites are allowed. Any later mutation behavior must be represented as an append-only patch/audit trail rather than replacing existing memory rows without traceability.
