# Idempotency Conflict Service

This document describes the internal idempotency conflict detection service.

The service is defined in:

```text
lib/services/idempotency-conflict-service.ts
```

## Purpose

The service turns cache lookup outcomes into a conflict decision.

It does not replay responses and does not claim idempotency keys.

## Outcomes

The service returns:

- `not_applicable` when no key is present
- `clear` when a key is present and no cache row exists
- `replay_available` when the stored request hash matches
- `conflict` when the stored request hash differs

## Enforcement Helper

`requireNoIdempotencyConflict()` converts a conflict result into an `idempotency_conflict` repository error.

## Disabled-State Guarantees

This step does not add:

- public route wiring
- route reads
- route writes
- idempotency claiming
- response replay
- memory writes
- external model calls
- retrieval

The service is internal-only until later guarded route work.
