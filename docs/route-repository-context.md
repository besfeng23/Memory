# Route Repository Context

This document describes the safe route repository context helper.

The helper is defined in:

```text
lib/api/route-repository-context.ts
```

## Purpose

Repository context controls the ownership boundary for future route-backed operations.

The authenticated Supabase user id must be the only source of `userId` for repository calls.

## Contract

The helper accepts:

- authenticated user object
- namespace
- optional request id

It returns a repository context with:

- `userId` from the authenticated user
- namespace from the validated route request
- optional request id

## Safety Rule

Routes must not accept `user_id` from request bodies, query strings, or headers as the ownership boundary.

## Disabled-State Guarantees

This step does not add:

- live ingest
- public route writes
- public route reads
- idempotency claiming
- response replay
- memory writes
- external model calls
- retrieval

The helper prepares safe context construction for later guarded route work.
