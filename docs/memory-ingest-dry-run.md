# Memory ingest dry-run path

The memory ingest dry-run path is a test-only contract exercise for `POST /api/memory/ingest`. It is not live ingest and must not be used as a production memory write path.

## What it does

- Validates the disabled route harness shape while the route is still production-disabled.
- Runs only when the memory ingest route feature flag is enabled in `NODE_ENV=test`.
- Returns a completed dry-run candidate response so tests can verify realistic guarded-ingest behavior.
- Keeps namespace handling explicit:
  - `real_life` remains the real-life namespace.
  - `au` remains story/AU-only and must never be treated as real-life evidence.
- Records that any future persistence must be append-only by design, with no silent overwrites.

## What it does not do

- It does not activate production ingest.
- It does not write memory rows or source rows.
- It does not write idempotency or response-cache rows.
- It does not call OpenAI or any model provider.
- It does not add embeddings, pgvector, GPT Actions, MCP, or seed/fake production rows.
- It does not trust client-supplied `user_id`; authenticated user identity must come from server auth/user context only.

## Dry-run result contract

The dry-run candidate service returns a successful repository result with:

- `status: "completed"`
- the requested namespace
- no `memoryItemId`
- `sourceIds: []`
- `warnings` containing `dry_run_only`
- a `dryRun` object showing the planned operations are simulated only:
  - `wouldClassify: true`
  - `wouldExtractCandidates: true`
  - `wouldValidateNamespace: true`
  - `wouldPersist: false`
  - `wouldCallModel: false`

This lets the route and harness contract evolve toward real persistence while preserving the current safety boundary: production remains disabled and test mode remains no-write/no-model.
