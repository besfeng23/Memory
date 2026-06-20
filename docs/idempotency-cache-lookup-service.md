# Idempotency Cache Lookup Service

This document describes the internal idempotency cache lookup service.

The service is defined in:

```text
lib/services/idempotency-cache-lookup-service.ts
```

## Purpose

The service checks whether an idempotency key can reuse a cached response, should miss, or should be treated as a conflict.

It compares the current request hash with the stored request hash for the same owner, namespace, and idempotency key.

## Outcomes

The service returns one of three internal outcomes:

- `miss`
- `hit`
- `conflict`

A conflict means the same idempotency key was used for a different request body.

## Inputs

The lookup requires:

- authenticated repository context
- route name
- request body
- optional idempotency key
- internal response-cache repository contract

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
