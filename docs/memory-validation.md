# Memory Validation Foundation

Pandora Memory Engine now includes service-layer validators for memory candidates and patch candidates.

This is still not the memory engine. It does not add public API routes, OpenAI calls, retrieval, persistence, or patch execution.

## Files

```text
lib/memory/validation/contracts.ts
lib/memory/validation/result.ts
lib/memory/validation/validators.ts
lib/memory/validation/index.ts
```

## What Exists

The validation foundation provides:

- structured validation result types
- memory source candidate schema
- memory candidate schema
- memory patch candidate schema
- namespace/context matching
- namespace-specific memory type checks
- real-life source requirements for high-confidence memory
- AU hard-canon source requirements
- patch candidate reason checks
- patch candidate snapshot checks

## Memory Candidate Rules

A memory candidate must include:

- namespace
- memory type
- title
- body
- strength
- confidence
- canon status
- optional source summary
- metadata
- source candidates

The candidate namespace must match the service context namespace.

Real-life candidates support:

- observation
- user preference
- contradiction
- real-life fact
- business fact
- relationship signal
- risk signal

AU/story candidates support:

- observation
- user preference
- soft canon
- hard canon
- contradiction
- retcon candidate

## Source Rules

High-confidence real-life memory candidates require at least one source.

AU hard-canon memory candidates require at least one source or conversation reference.

Real-life memory without a source is allowed only as lower-confidence memory and produces a warning.

## Patch Candidate Rules

Patch candidates are validated but not executed.

A patch candidate must include:

- namespace
- memory item id
- patch type
- after snapshot
- metadata

Patch candidates that modify existing memory require a reason and a before snapshot.

## What This Does Not Add

This step does not add:

- memory ingest routes
- memory search routes
- memory persistence
- patch execution
- audit log writes
- retrieval log writes
- OpenAI extraction
- pgvector retrieval
- GPT Actions
- MCP server
- fake data

## Next Step

Prompt 13 should add memory candidate service functions that combine validation with safe repositories, still without exposing public routes.
