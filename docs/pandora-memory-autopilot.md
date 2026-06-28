# Pandora Memory Autopilot (Phase 5A)

Phase 5A makes Pandora automatic without making it reckless. ChatGPT should not need the user to say “retrieve memory,” “save this,” or “use Pandora” before important answers.

## Safe automatic loop

1. `pre_answer`: decide whether continuity memory is useful and retrieve context when allowed.
2. `post_answer`: decide whether the exchange contains durable memory and queue candidates when allowed.
3. Review later: approve, edit, reject, or promote candidates into permanent memory.

Candidate queueing is not permanent memory capture. Phase 5A writes to `memory_capture_candidates` only by default.

## Runtime flags

Recommended production posture after smoke testing:

```bash
PANDORA_ENABLE_MEMORY_AUTOPILOT=true
PANDORA_MEMORY_AUTOPILOT=queue
PANDORA_AUTO_RETRIEVE=true
PANDORA_AUTO_CANDIDATE_QUEUE=true
PANDORA_AUTO_CAPTURE_LOW_RISK=false
PANDORA_SENSITIVE_MEMORY_REQUIRES_APPROVAL=true
PANDORA_ENABLE_MEMORY_CONTEXT_API=true
PANDORA_ENABLE_MEMORY_CAPTURE_API=true
PANDORA_ENABLE_MODEL_CALLS=false
PANDORA_ENABLE_EMBEDDINGS=false
PANDORA_ENABLE_SEMANTIC_RETRIEVAL=false
PANDORA_ENABLE_PUBLIC_MEMORY_READ=false
PANDORA_ENABLE_PUBLIC_MEMORY_PERSISTENCE=false
PANDORA_ENABLE_AUTO_CAPTURE=false
```

`PANDORA_MEMORY_AUTOPILOT` modes:

- `off`: no automatic retrieval or candidate writes.
- `suggest`: return decisions/previews only.
- `queue`: queue durable candidates for review.
- `capture_low_risk`: reserved for future permanent low-risk capture; Phase 5A returns `auto_capture_not_implemented` and still queues safely.

## Safety boundaries

- Public memory read/write stays disabled.
- Model calls, embeddings, and semantic vector retrieval are not required and remain off by default.
- Secrets and credentials are redacted/blocked through the existing secret detector and candidate pipeline.
- Sensitive, private, high-risk, relationship, legal, health, money, gambling, and reputation memories require review.
- `real_life` and `au` namespaces stay separated. Explicit namespace wins; otherwise AU/canon/story signals infer `au`, while repo/business/life/risk signals infer `real_life`.
- REST writes require the existing bridge auth and `PANDORA_ENABLE_MEMORY_CAPTURE_API=true`.
- MCP post-answer writes require `PANDORA_ENABLE_MCP_CAPTURE=true`; pre-answer retrieval does not.

## Limitations

Phase 5A is deterministic and keyword-based. It does not implement the future review console, feedback learning, contradiction detection, daily compaction, real embeddings, model-powered extraction, or permanent autosave.

## Phase 5B Candidate Review

Phase 5A queues durable memory candidates automatically, but it does not make them permanent memory by default. Phase 5B adds the operator review console at `/admin/memory/candidates`, where Joven can approve, reject, edit, mark duplicate, or capture candidates. This keeps Pandora teachable: autopilot surfaces what might matter, while human review prevents noisy, sensitive, wrong, duplicate, or wrong-namespace items from polluting durable memory.

## Phase 5C Daily Compaction

Phase 5A queues candidates. Phase 5B reviews and captures candidates. Phase 5C compacts reviewed/captured memory into versioned profiles, open loops, and daily context packs. This is the deterministic compounding layer that lets Pandora improve over time without enabling model calls, embeddings, semantic retrieval, public reads, public writes, or permanent auto-capture.

Recommended environment posture:

```bash
PANDORA_ENABLE_MEMORY_DISTILLATION=true
PANDORA_INTERNAL_JOB_TOKEN=<server-only-secret>
PANDORA_ENABLE_MODEL_CALLS=false
PANDORA_ENABLE_EMBEDDINGS=false
PANDORA_ENABLE_SEMANTIC_RETRIEVAL=false
PANDORA_ENABLE_PUBLIC_MEMORY_READ=false
PANDORA_ENABLE_PUBLIC_MEMORY_PERSISTENCE=false
PANDORA_ENABLE_AUTO_CAPTURE=false
```

`PANDORA_INTERNAL_JOB_TOKEN` must remain server-only and must never be exposed as a `NEXT_PUBLIC_*` variable. Do not enable model calls or embeddings just for compaction, and do not enable permanent auto-capture yet.
