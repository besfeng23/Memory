# Pandora Memory Phase 5C: Daily Compaction

Phase 5C adds deterministic daily compaction for Pandora Memory. It turns reviewed and captured source-backed memory into clean operating context: versioned profiles, open loops, and daily context packs.

## Why compaction matters

Phase 5A queues candidates. Phase 5B lets an operator approve, reject, edit, duplicate, or capture them. Phase 5C makes the reviewed/captured layer compound over time instead of becoming an infinite event log.

## Data layers

- **Candidates** are proposed memory items awaiting review or capture.
- **Memory events** are captured, source-backed memory rows.
- **Session digests** summarize sessions and can feed compaction wrappers.
- **Profiles** store durable operating, project, risk, relationship, people, deployment, and AU canon state.
- **Open loops** track unresolved blockers, risks, review backlog, and follow-up actions.
- **Context packs** are generated daily or master summaries for downstream private context use.

## Deterministic profile synthesis

`runDailyMemoryCompaction` scans recent rows by `user_id`, `namespace`, and ISO `since`. It uses deterministic keyword signals only. It does not call models, create embeddings, or use semantic retrieval.

Profile updates are versioned. Existing active profiles are marked `superseded`, and a new active row is inserted with merged evidence references.

## Feedback-aware compaction

Approved and captured candidates are eligible profile/open-loop inputs. Rejected and duplicate candidates remain visible in the compaction result but are not promoted as source material. Edited candidate fields are preferred because compaction reads the reviewed candidate title/summary/type/sensitivity fields.

Blocked secrets are excluded and redacted before pack creation.

## Open-loop updates

The open-loop engine creates or updates loops by `user_id`, `namespace`, `loop_type`, and `subject_key`. Existing open/acknowledged loops are updated, evidence references are merged, and severity can increase but not downgrade.

## Daily context packs

Daily compaction creates a `memory_context_packs` row with `pack_type=daily`, key points, projects, people, decisions, risks, open loops, and generated event ids. Older active daily packs for the same user/namespace are superseded when possible.

## Internal job endpoint

`POST /api/memory/jobs/daily-digest`

Headers:

```http
Authorization: Bearer <PANDORA_INTERNAL_JOB_TOKEN>
```

Body:

```json
{ "namespace": "real_life", "since": "2026-06-27T00:00:00.000Z", "dry_run": true }
```

The endpoint requires `PANDORA_ENABLE_MEMORY_DISTILLATION=true` and is internal-token protected. If needed for the first single-user rollout, send `user_id` only through this internal-token route or configure `PANDORA_MEMORY_BRIDGE_USER_ID` server-side.

## Env posture

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

Never expose `PANDORA_INTERNAL_JOB_TOKEN` as `NEXT_PUBLIC_*`.

## Safety boundaries

- deterministic only
- no model calls required
- no embeddings required
- no semantic retrieval required
- no public memory reads/writes
- blocked secrets excluded/redacted
- `real_life` and `au` remain separated
- permanent auto-capture remains disabled by default

## Rollout

1. Deploy with `PANDORA_INTERNAL_JOB_TOKEN` configured.
2. Keep model calls, embeddings, semantic retrieval, public read/write, and auto-capture off.
3. Enable `PANDORA_ENABLE_MEMORY_DISTILLATION=true`.
4. Run the daily digest endpoint with `dry_run=true`.
5. Inspect profile, loop, and pack output.
6. Run for `real_life`.
7. Run for `au`.
8. Verify daily context packs appear.
9. Verify active profiles version correctly.
10. Verify open loops update without duplicate spam.
11. Only then schedule the job externally.
