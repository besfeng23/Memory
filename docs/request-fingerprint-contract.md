# Request Fingerprint Contract

This document describes the internal request hashing helper.

The helper is defined in:

```text
lib/api/request-fingerprint.ts
```

## Purpose

The helper creates stable hashes for future idempotency and replay checks.

It canonicalizes JSON object keys before hashing so equivalent request bodies produce the same hash.

## Inputs

A request fingerprint includes:

- namespace
- route
- request body
- idempotency key when present

## Disabled-State Guarantees

This step does not add:

- route wiring
- route reads
- route writes
- idempotency claiming
- response replay
- memory writes
- external model calls
- retrieval

The helper is internal-only until a later service wires it behind guarded tests.
