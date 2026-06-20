# Memory ingest write-plan builder

The memory ingest write-plan builder is a planning layer only. It prepares the ordered, append-only persistence plan that a future authenticated ingest writer would execute after validation and preflight have succeeded.

## Current behavior

The builder does **not** write memory rows. It returns `wouldPersist: false`, marks every planned operation as `mode: "planned_only"`, and marks every operation with `writesNow: false`.

The builder also does **not** call OpenAI, models, embeddings, retrieval, pgvector, GPT Actions, MCP, or any Supabase write APIs. It consumes only the authenticated repository context, the parsed request, the persistence preflight result, and optional request hash/fingerprint metadata.

`/api/memory/ingest` remains production-disabled. Test-mode and dry-run flows may expose write-plan readiness, but the public production route must not become a real write path until a later PR explicitly enables a transactional writer.

## Ownership boundary

Authenticated repository context is the ownership boundary. Future writes must use only `RepositoryContext.userId` as the memory owner. Client-supplied `user_id` or `userId` metadata is never trusted, never changes ownership, and blocks the write plan as `client_user_id_override_attempt`.

## Namespace isolation

Namespace isolation is mandatory and explicit:

- `real_life` plans remain scoped to `real_life`.
- `au` plans remain scoped to `au` and story/fictional context.
- AU/story data must never be treated as real-life evidence.
- The repository context namespace must match the parsed request namespace.
- Cross-namespace plans are blocked.

## Future append-only operation order

A ready plan returns the future operation order below. Each operation is planned-only, append-only, and no-write today:

1. `validate_namespace_boundary`
2. `insert_memory_source`
3. `insert_memory_item`
4. `insert_memory_patch`
5. `insert_audit_log`
6. `finalize_idempotency_record`

The planned `insert_*` names document future append-only inserts. They are not current database writes.

## Blocking rules

The builder returns `status: "blocked"` when any of the following are true:

- Persistence preflight is not `ready`.
- Repository context namespace does not match the request namespace.
- Authenticated repository user ID is missing.
- Request input is empty.
- Request metadata includes client-supplied `user_id` or `userId`.

## Future implementation requirements

A later real writer must execute the accepted plan transactionally and idempotently. It must preserve append-only behavior, avoid silent overwrites, maintain auditability, and finalize idempotency only after all prior transactional operations succeed.
