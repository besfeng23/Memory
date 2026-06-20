# Disabled Memory Ingest Route

Pandora has a disabled route harness for future memory ingest work.

```text
POST /api/memory/ingest
```

This route now checks for an authenticated session before returning the disabled response.

If no user is authenticated, it returns `401` with `auth_required`.

If a user is authenticated, it returns `501 Not Implemented`.

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

Authenticated but disabled:

```json
{
  "ok": false,
  "code": "not_implemented",
  "route": "/api/memory/ingest",
  "status": "disabled_stub",
  "authenticated": true
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

The next step should continue internal engine assembly or add route-level request parsing while still keeping the route disabled.
