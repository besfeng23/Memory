# Phase 4C / Phase 5 — Pandora Adaptive Memory Intelligence

Adds a gated adaptive layer on top of Phase 4A REST and Phase 4B MCP: classification, secret redaction, model-provider abstraction, private embeddings abstraction, hybrid retrieval, candidates, session digests, profiles, open loops, adaptive ChatGPT context, REST endpoints, MCP tools, admin status pages, migrations, and tests.

Public memory read/write remain off by default and are not part of this phase. Model calls require `PANDORA_ENABLE_MODEL_CALLS=true`; embeddings require `PANDORA_ENABLE_EMBEDDINGS=true`; semantic retrieval requires `PANDORA_ENABLE_SEMANTIC_RETRIEVAL=true`.

Rollback: set `PANDORA_ENABLE_MODEL_CALLS=false`, `PANDORA_ENABLE_EMBEDDINGS=false`, `PANDORA_ENABLE_SEMANTIC_RETRIEVAL=false`, `PANDORA_ENABLE_AUTO_CAPTURE=false`, and keep public gates false.
