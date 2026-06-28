# Pandora Memory Candidate Review (Phase 5B)

Phase 5B exists because Memory Autopilot should surface possible durable memories, not autosave everything. A candidate is an auto-queued suggestion in `memory_capture_candidates`. An approved candidate is a human-reviewed candidate that is eligible for promotion. A captured memory event is the durable, source-backed row written to `memory_events` after approval.

## Status meanings

- `pending`: awaiting operator review.
- `approved`: reviewed and eligible for capture.
- `rejected`: not durable, wrong, noisy, too sensitive, wrong namespace, or otherwise unsuitable.
- `captured`: promoted to `memory_events` with `captured_event_id` recorded.
- `blocked_secret`: secret-like content was detected; raw content stays redacted and cannot be approved or captured.
- `duplicate`: useful feedback that this candidate repeats another candidate or memory.

## Review flows

Operators can edit title, summary, type, sensitivity, importance, tags, risks, people, and projects before approval. Edited fields are secret-scanned; detected credentials block the edit and keep the candidate out of durable memory.

Approve-and-capture is intentionally two-step. High and private candidates require explicit approval before capture. Capture writes redacted/summary content only, updates the candidate to `captured`, records `captured_event_id`, and writes feedback events.

Duplicates can be marked with an optional duplicate candidate reference. This is feedback for future duplicate detection without enabling embeddings or semantic retrieval.

## Feedback groundwork

`memory_feedback_events` records approve, reject, edit, duplicate, and capture actions with old/new status, memory type/sensitivity changes, review notes, reasons, and metadata. This becomes a training signal for future scoring and review assistance.

## Safety boundaries

Public reads and public persistence remain off. Model calls, embeddings, semantic retrieval, GPT Actions, MCP, and permanent auto-capture remain off by default. All review operations are authenticated, capture-gated, user-scoped, namespace-scoped, and do not bypass RLS or bridge auth.

## Recommended rollout

1. Deploy with the existing Phase 5A environment.
2. Keep `PANDORA_AUTO_CAPTURE_LOW_RISK=false`.
3. Open `/admin/memory/candidates`.
4. Verify pending candidates load.
5. Reject blocked/noisy candidates.
6. Edit then approve good candidates.
7. Capture approved candidates.
8. Confirm `memory_events` receives captured memories.
9. Do not enable permanent auto-capture yet.
