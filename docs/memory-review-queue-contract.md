# Memory review queue contract

The memory review queue is the human approval boundary between deterministic extraction and any future Supabase-backed persistence. It introduces contracts, builders, validators, and preview-only write-plan metadata; it does **not** write memory.

## No-write default

Review queue services return `wouldPersist: false` and do not call OpenAI, model providers, retrieval, embeddings, pgvector, GPT Actions, MCP, or Supabase write adapters. `/api/memory/ingest` remains production-disabled and is not wired to this review queue.

## Human review requirements

Mixed real-life/AU content and sensitive candidates require review. Sensitive unresolved items are blocked until a reviewer explicitly resolves the sensitivity state. Mixed content must be reviewed and resolved before any append-only preview can be generated.

## Namespace isolation

Namespace isolation is mandatory:

- AU/story memory remains AU-scoped and cannot become real-life evidence.
- Real-life memory remains real-life-scoped and cannot enter AU unless explicitly fictionalized and reviewed.
- Client-supplied `user_id` is never trusted; authenticated ownership comes only from server repository/reviewer context.
- Review decisions must not silently change namespaces.

## Append-only preview only

Approved items can only preview append-only ingest candidate structures and planned metadata. Update, delete, overwrite, namespace mismatch, missing evidence, unresolved sensitive state, and unresolved mixed content all block preview generation.
