# Memory ingest Supabase persistence adapter draft

This document describes the internal Supabase-backed persistence adapter draft for the Pandora Memory Engine memory ingest persistence subsystem.

## Scope

- The adapter is an internal draft only.
- It is not wired to `/api/memory/ingest`.
- It does not activate production ingest.
- It does not introduce any public route write path or live database writes from the route.
- Tests use mocked Supabase-like clients only and do not require live Supabase credentials.

## Ownership boundary

Authenticated repository context is the ownership boundary. Future persistence must derive `user_id` only from server auth/repository context. Request metadata such as `user_id` or `userId` is never trusted and must not override the authenticated context.

## Namespace isolation

Namespace handling remains explicit for both `real_life` and `au`.

- `real_life` records must remain real-life scoped.
- `au` records must remain alternate-universe/story scoped.
- AU/story data must never become real-life evidence.
- Any namespace mismatch between request, repository context, write plan, transaction plan, or adapter input must block persistence.

## Append-only persistence

The adapter is designed around append-only insert semantics. Future writes must append source, item, patch, audit, and idempotency rows. The adapter does not expose update, delete, overwrite, replace, or upsert-overwrite methods. Silent overwrites are not allowed.

## Transaction/RPC boundary

Future production use must go through the memory ingest transaction/RPC boundary. Persistence operations must execute atomically, preferably via a database RPC or transaction wrapper. Idempotency finalization must happen only after source, item, patch, and audit inserts succeed. Any failed operation must roll back the whole transaction. The public route must not bypass this boundary.

## Non-goals and exclusions

This draft introduces no model calls, retrieval calls, pgvector work, GPT Actions, MCP integration, seed data, or fake production rows. It also does not instantiate Supabase in the public route and does not introduce service-role use in public routes.
