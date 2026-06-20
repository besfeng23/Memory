# Memory ingest extraction pipeline

The memory ingest extraction pipeline connects the deterministic extraction and classification layer to the existing ingest candidate preparation path.

It covers this no-write bridge:

```text
raw text → namespace classification → deterministic extraction → validation → candidate ingest preparation → no-write write-plan metadata
```

## Scope

This pipeline is intentionally limited to controlled test and dry-run orchestration. It does not activate the public production ingest route and does not persist memory.

The implementation lives in:

- `lib/services/memory-ingest-extraction-pipeline.ts` for orchestration.
- `lib/services/memory-extracted-candidate-mapper.ts` for converting validated extracted candidates into ingest candidate request structures.
- `lib/services/memory-ingest-dry-run-candidate.ts` for surfacing extraction summary metadata in dry-run responses.

## No model calls, embeddings, or retrieval

This pipeline uses only deterministic local classification and extraction. It introduces no OpenAI calls, no model-provider calls, no embeddings, no pgvector dependency, no retrieval flow, no GPT Actions, and no MCP integration.

All returned results explicitly report:

- `wouldCallModel: false`
- `wouldPersist: false`

Dry-run metadata also confirms no model calls and no persistence when extraction summary metadata is present.

## Namespace isolation

Namespace isolation remains mandatory:

- `real_life` data is handled as real-life evidence only.
- `au` data is handled as fictional/story-scoped continuity only.
- AU/story data must never be treated as real-life evidence.
- Real-life data must not enter AU unless it is explicitly marked fictionalized.
- Namespace mismatches are rejected during candidate mapping.

Mixed real-life + AU/story content, especially sexual or fictionalized content involving real people or real-life relationships, requires review or blocks the pipeline.

## Append-only write planning

The mapper accepts only append-only candidates. It rejects candidates that request `update`, `delete`, or `overwrite`, as well as candidates missing evidence spans.

The write-plan summary is still no-write metadata. It uses the existing persistence preflight and write-plan builder to describe future append-only operations, but it does not execute persistence and does not perform live Supabase writes.

Future persistence remains append-only by design: sources, items, patches, audit logs, and idempotency records are planned as append-only operations with `writesNow: false` in dry-run mode.
