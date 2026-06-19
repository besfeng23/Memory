# Transaction and Idempotency Scaffolding

Pandora Memory Engine now includes internal scaffolding for transaction boundaries and idempotency fingerprints.

This is not a public mutation system yet.

## Files

```text
lib/services/transaction-boundary.ts
lib/services/idempotency.ts
```

## What Exists

The transaction boundary provides:

- `runTransactionBoundary`
- `createInlineTransactionAdapter`
- typed `TransactionAdapter`
- typed `TransactionBoundaryContext`

The idempotency helper provides:

- `validateIdempotencyKey`
- `buildIdempotencyContext`
- scoped fingerprints tied to user, namespace, operation, and key

## Transaction Boundary

`runTransactionBoundary` can require a real transaction adapter before running an operation.

If no adapter is supplied and `requireTransaction` is `true`, the operation fails before mutation.

If no adapter is supplied and `requireTransaction` is `false`, the operation runs inline. This exists only for internal scaffolding and tests.

## Idempotency Boundary

Idempotency context can be built from:

- client key
- request id
- payload hash

The resulting fingerprint includes:

- user id
- namespace
- scope
- operation
- normalized key

This prevents cross-user and cross-namespace key reuse from colliding.

## Important Limit

There is no persistent idempotency table yet.

This means idempotency is not durable across requests or deployments. Public mutation routes must not be exposed until persistent idempotency storage exists.

## What This Does Not Add

This step does not add:

- public API routes
- database transaction implementation
- persistent idempotency records
- OpenAI calls
- pgvector retrieval
- memory ingest
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Next Step

Prompt 18 should add persistent idempotency storage and RLS-protected database support, still without public mutation routes.
