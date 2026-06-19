# Internal Mutation Safety Orchestration

Pandora Memory Engine includes internal mutation wrappers that combine validation services with idempotency checks and transaction boundary scaffolding.

This is not a public mutation API.

## File

```text
lib/memory/services/mutation-safety.ts
```

## What Exists

The service exposes:

- `saveMemoryCandidateWithSafety`
- `saveMemoryPatchWithSafety`

Each wrapper:

1. Builds a user and namespace scoped idempotency fingerprint.
2. Blocks duplicate mutations before writes.
3. Runs the underlying internal mutation through the transaction boundary.
4. Writes a completed or failed idempotency outcome record.

## Strategies

The wrapper supports two internal idempotency strategies:

- `repository`
- `rpc`

The default `repository` strategy uses the existing internal repository helper path.

The `rpc` strategy uses:

- `claimIdempotencyRecord`
- `finishIdempotencyRecord`
- `claim_idempotency_record`
- `finish_idempotency_record`

The RPC strategy claims the idempotency record inside the database before the mutation runs. If the claim already exists, the mutation is blocked before any memory row write.

## Guardrails

The wrapper requires:

- authenticated owner context
- namespace context
- idempotency key source
- internal mutation service input

The wrapper does not trust a client-supplied owner id.

## Supported Key Sources

The idempotency fingerprint may be built from:

- explicit client key
- request id
- payload hash

The final fingerprint is scoped by:

- user id
- namespace
- mutation scope
- operation name
- normalized key

## Current Limits

The wrapper can require a transaction adapter, but a full memory-specific database transaction is still not implemented.

The RPC strategy gives a database-backed idempotency claim and finish boundary, but the memory row write itself is still performed by the internal service layer.

Until a memory-specific database function or equivalent transaction-safe path exists, the memory row writes and idempotency finish are not guaranteed to commit as a single atomic unit.

## What This Does Not Add

This step does not add:

- public API routes
- public mutation behavior
- OpenAI calls
- pgvector retrieval
- memory ingest endpoint
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Next Step

Prompt 22 should move one internal mutation path into a single database-backed transaction/RPC function before any public mutation route is exposed.
