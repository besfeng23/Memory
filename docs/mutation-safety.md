# Internal Mutation Safety Orchestration

Pandora Memory Engine now includes internal mutation wrappers that combine validation services with idempotency checks and transaction boundary scaffolding.

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
2. Checks persistent idempotency records for an existing matching operation.
3. Blocks duplicate mutations before writes.
4. Runs the underlying internal mutation through the transaction boundary.
5. Writes a completed or failed idempotency outcome record.

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

The wrapper can require a transaction adapter, but a real database transaction adapter is still not implemented.

Outcome records are written after the underlying mutation result. Until a true transaction adapter is implemented, a mutation and its idempotency outcome are not guaranteed to commit atomically.

The persistent lookup currently uses the repository list path before filtering by fingerprint. This is an internal scaffold and not the final conflict detection strategy.

## What This Does Not Add

This step does not add:

- public API routes
- public mutation behavior
- real database transaction implementation
- OpenAI calls
- pgvector retrieval
- memory ingest endpoint
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Next Step

Prompt 20 should add a database-backed transaction adapter or RPC strategy before any public mutation route is exposed.
