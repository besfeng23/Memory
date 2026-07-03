# Pandora Operator Verification Console

## What is live

`/pandora` remains an authenticated operator dashboard. The verification console adds read-only server-side checks for the authenticated Supabase user only:

- active and archived/superseded `memory_context_packs` master-pack counts per namespace;
- newest active master pack metadata and previous archived/superseded master-pack metadata;
- recent `memory_context_pack_distilled` audit evidence from `audit_logs`;
- retrieval-log/eval evidence when a real row exists;
- smoke evidence when a real audit row exists.

The loader fails safe: missing or unreadable tables become warnings and empty evidence states, not green success.

## What remains gated

The console does not enable model calls, embeddings, semantic retrieval, GPT Actions, MCP, public reads, public persistence, destructive actions, production ingest writes, protected non-dry-run jobs, or pruning application/archive/delete behavior.

## Status meanings

- `pass`: real rows support the invariant or evidence claim.
- `warning`: the dashboard rendered safely, but evidence is incomplete or a table was unavailable.
- `fail`: an invariant is violated, such as duplicate active master packs.
- `not_run`: no real evidence was returned, so the console makes no success claim.

## Why retrieval eval must not show fake accuracy

Retrieval status is only shown from real persisted evidence. If no retrieval eval/log row exists, the console says `Not run`. It must not display placeholder percentages or marketing copy because that would falsely imply retrieval quality has been measured.

## Why smoke evidence is read-only

Smoke evidence is an audit proof surface. The dashboard only reads audit rows and never starts a smoke test, writes proof rows, mutates memory, or marks a smoke check as successful without persisted evidence.

## Manual Supabase verification

When needed, verify with authenticated, user-scoped SQL or table views:

1. Check `memory_context_packs` filtered by `user_id`, `namespace`, `pack_type = 'master'`, and `status`.
2. Confirm exactly one active master pack for `real_life` and exactly one for `au`.
3. Confirm archived/superseded previous master packs exist when supersession has happened.
4. Check `audit_logs` for `action = 'memory_context_pack_distilled'` and smoke/proof actions.
5. Check retrieval evidence tables/logs only if a real eval has been run.

Do not use service-role browser code or client-supplied user IDs for this verification.
