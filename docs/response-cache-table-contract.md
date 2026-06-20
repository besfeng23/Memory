# Response Cache Table Contract

This document describes the future response-cache storage contract for memory ingest.

The table is defined in:

```text
supabase/migrations/20260620000600_memory_ingest_response_cache_contract.sql
```

The typed internal contract and disabled implementation are defined in:

```text
lib/db/response-cache-contract.ts
```

## Purpose

The future table is intended to support safe idempotent replay after live ingest exists.

It is not used by the current disabled `/api/memory/ingest` route.

## Contract Fields

The table stores future cache entries by authenticated owner, namespace, and idempotency key:

- `user_id`
- `namespace`
- `idempotency_key`
- `request_hash`
- `response_status`
- `response_body`
- `warnings`
- `expires_at`
- replay bookkeeping fields

The unique key is:

```text
(user_id, namespace, idempotency_key)
```

## Internal Repository Contract

The repository contract names the future table and defines typed inputs for:

- lookup by row id
- lookup by idempotency key
- creating a row

The disabled implementation satisfies the contract, but every method returns a disabled repository error. It does not create a Supabase client, issue database calls, or connect to any route.

## Disabled-State Guarantees

This step does not add:

- route writes to the table
- route reads from the table
- response replay
- idempotency claiming
- memory item creation
- source creation
- extraction
- external model calls
- retrieval

RLS is enabled on the table, and no permissive access policy is added in this step.

## Next Step

Add a real internal implementation behind a separate flag or strategy, still without wiring it into the public route.
