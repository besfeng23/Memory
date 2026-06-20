# Memory Ingest Test Mode

This document describes the test-only mode helper for future ingest work.

The helper is defined in:

```text
lib/api/memory-ingest-test-mode.ts
```

## Rule

The memory ingest route can only be considered enabled when both are true:

```text
NODE_ENV=test
PANDORA_ENABLE_MEMORY_INGEST_ROUTE=true
```

If the route flag is set outside `NODE_ENV=test`, the helper returns `blocked_non_test`.

## Current Boundary

This step does not import the helper into the public route.

It adds only a helper, tests, and documentation.

No live ingest, route write, route read, response replay, model call, retrieval, or seed row is added.
