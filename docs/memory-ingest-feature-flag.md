# Memory Ingest Route Feature Flag

This document describes the route feature flag for future ingest work.

The helper is defined in:

```text
lib/api/memory-ingest-feature-flag.ts
```

## Flag

```text
PANDORA_ENABLE_MEMORY_INGEST_ROUTE
```

## Default

The route feature flag is off by default.

Only the exact string `true` enables it.

## Current Safety Boundary

This step only adds the flag helper and tests.

It does not import the helper into the public route yet.

It does not add live ingest, route writes, route reads, response replay, model calls, retrieval, or seed rows.
