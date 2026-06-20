# Memory Ingest Route Test Harness

This document describes the internal route test harness for future memory ingest work.

The harness is defined in:

```text
lib/api/memory-ingest-route-test-harness.ts
```

## Scope

The harness is internal and test-only.

It checks the test-mode feature state, validates the request body, creates an authenticated repository context, and then calls the guarded ingest service with injected dependencies.

## Current Boundary

The public route is not changed by this step.

No production route activation is added.

No live route write, route read, response replay, model call, retrieval, or seed row is added.
