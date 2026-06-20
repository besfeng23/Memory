# Disabled Memory Ingest Route

Pandora now has a disabled route harness for future memory ingest work.

```text
POST /api/memory/ingest
```

This route intentionally returns `501 Not Implemented`.

It does not create memory items, save sources, run extraction, call external models, run retrieval, or expose a public ingest workflow.

## Response

```json
{
  "ok": false,
  "code": "not_implemented",
  "route": "/api/memory/ingest",
  "status": "disabled_stub"
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

The next step should add route-level authentication checks while still keeping the route disabled, or continue internal engine assembly before enabling any live route behavior.
