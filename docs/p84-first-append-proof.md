# First append proof implementation note

This branch wires the internal one-item append proof path without enabling public persistence, production ingest, retrieval, embeddings, GPT Actions, MCP, or ChatGPT context assembly.

## What changed

`/api/admin/memory/live-one-item` now has a direct internal proof executor fallback when `PANDORA_ENABLE_ONE_ITEM_PROOF_EXECUTOR=true` and the normal injected workflow dependencies are not present.

The executor still requires:

- authenticated Supabase session
- `x-pandora-internal-persistence-mode: approved-review-executor`
- `x-pandora-internal-operator-token` matching server-only `PANDORA_INTERNAL_OPERATOR_TOKEN`
- typed confirmation: `APPEND MEMORY`
- one `reviewItemId`
- one `decisionId`
- one `idempotencyKey`
- one memory text payload using `memoryText` or `input`

## Gates that must remain disabled

The route blocks if any of these are enabled:

- public memory persistence
- production ingest writes
- public memory reads
- model calls
- embeddings
- semantic retrieval
- GPT Actions
- MCP

## Gates required for this internal proof only

- `PANDORA_ENABLE_ONE_ITEM_PROOF_EXECUTOR=true`
- `PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE=true`
- `PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE=true`

## Result

On success, the route appends exactly one memory item, one source, one patch, and one audit event using the authenticated server user. The response is redacted and returns fingerprints plus IDs needed for proof capture. Stop after one item. Do not proceed to retrieval.
