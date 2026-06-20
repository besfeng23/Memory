# Disabled Memory Ingest Route

Pandora has a disabled route harness for future memory ingest work.

```text
POST /api/memory/ingest
```

This route checks for an authenticated session, parses the request body, and validates it against the future ingest contract.

If no user is authenticated, it returns `401` with `auth_required`.

If the request body is invalid, it returns `400` with `validation_failed`.

If the user is authenticated and the request body is valid, it still returns `501 Not Implemented`.

Idempotency keys are trimmed and must be 8 to 128 characters using only letters, numbers, dot, underscore, colon, or hyphen.

The route reports whether a valid idempotency key was present, but it does not persist or claim that key yet.

It does not create memory items, save sources, run extraction, call external models, run retrieval, or expose a live workflow.

## Responses

Unauthenticated:

```json
{
  "ok": false,
  "code": "auth_required",
  "route": "/api/memory/ingest",
  "status": "disabled_stub"
}
```

Invalid request:

```json
{
  "ok": false,
  "code": "validation_failed",
  "route": "/api/memory/ingest",
  "status": "disabled_stub",
  "authenticated": true,
  "issues": []
}
```

Authenticated, valid, but disabled:

```json
{
  "ok": false,
  "code": "not_implemented",
  "route": "/api/memory/ingest",
  "status": "disabled_stub",
  "authenticated": true,
  "namespace": "real_life",
  "idempotency_key_present": true
}
```

## Why This Exists

The route path can now be tested and documented before live behavior is allowed.

The implementation keeps the future route visible to CI while preventing accidental use as a mutation endpoint.

## Still Not Implemented

This step does not add:

- live memory ingest
- public mutation behavior
- OpenAI calls
- pgvector retrieval
- GPT Actions
- MCP server
- seed data
- fake operational rows

## Next Step

The next step should add idempotency conflict semantics while still keeping the route disabled.
