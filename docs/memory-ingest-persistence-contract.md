# Memory ingest persistence contract

This document describes the internal persistence repository contract introduced for future Pandora Memory Engine ingest writes.

## Status

- Internal contract only.
- Does **not** activate live memory ingest.
- Does **not** write memory from `/api/memory/ingest`.
- Does **not** call OpenAI, LLMs, embedding models, or any other model provider.
- Does **not** perform retrieval.
- Does **not** add pgvector, GPT Actions, MCP, seed data, or fake production rows.

The public ingest route remains production-disabled outside the existing test harness.

## Ownership boundary

Future persistence adapters must accept an authenticated repository context for every operation. That context is the ownership boundary:

- `context.userId` is the only trusted user identifier.
- Client-supplied `user_id` or `userId` metadata must not override ownership.
- Each operation must verify its `userId` matches `context.userId`.
- Each operation must verify its namespace matches `context.namespace` and the parsed request namespace.

## Namespace isolation

Namespace handling is mandatory and explicit:

- `real_life` data remains real-life scoped.
- `au` data remains fictional/story scoped.
- AU/story data must never be treated as real-life evidence.
- No adapter may persist across namespace boundaries.

## Append-only persistence

The repository contract is append-only by design. Future implementations may insert new records for:

1. memory sources
2. memory items
3. memory patches
4. audit logs
5. idempotency finalization records

Implementations must not expose update, delete, overwrite, replace, or silent upsert behavior. Conflict handling must be explicit and idempotent.

## Executor boundary

`executeMemoryIngestPersistencePlan` is an internal boundary that only runs when passed:

- `enabled: true`
- authenticated repository context
- parsed future ingest request
- a planned write plan
- an injected repository implementation

The executor validates operation order, append-only flags, namespace ownership, and user ownership before calling the injected repository. It does not import Supabase, instantiate clients, call models, or run retrieval.

## Future adapter requirements

A future real adapter must execute transactionally and idempotently. It must either commit all append-only inserts in the required order or leave no partial persistence behind, and it must finalize idempotency consistently with the committed records.
