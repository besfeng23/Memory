# Pandora Shadow Context Pack Lab v1

Shadow context packs are staged, operator-review candidates stored outside `memory_context_packs`. They let Pandora prepare deterministic context-pack evidence without replacing, promoting, deleting, distilling, embedding, or mutating production memory truth tables.

## Safety boundary

- Writes are limited to `pandora_shadow_context_packs`, `pandora_shadow_context_pack_events`, and the existing operator action/event tables.
- `memory_events`, `memory_context_packs`, `memory_profiles`, `memory_capture_candidates`, and `memory_pruning_candidates` are not mutated.
- No model calls, embeddings, semantic retrieval, GPT Actions, or MCP are used.
- Promotion to real context packs is unavailable in v1.
- All reads and writes use server-derived authenticated user identity and namespace filters.

## Statuses

Shadow packs may be `draft`, `ready_for_review`, `reviewed`, `rejected`, or `archived`.

## Candidate generation

The service reads recent namespace-scoped `memory_events`, active master pack metadata, open loops, and review queue counts. It produces deterministic payload fields: source event count, active master id, latest event timestamp, reviewed/promoted counts, open-loop count, review count, short recent summaries, and an evidence summary. Missing events or active master metadata create warnings and keep the candidate in `draft`.

## Operator action flow

`prepare_shadow_context_pack` can be proposed from the Operator Action Center. Dry-run computes the staged candidate and performs no insert. After approval, execution creates exactly one shadow candidate and shadow event; result metadata states `shadow_write_performed: true`, `no_core_memory_mutation_performed: true`, and `no_promotion_performed: true`.

## Manual smoke checklist

1. Sign in to `/pandora`.
2. Propose `prepare_shadow_context_pack` for one namespace.
3. Run dry-run and verify no shadow row was inserted.
4. Approve and execute.
5. Confirm the new candidate appears in the Shadow Context Pack Lab.
6. Mark reviewed, reject, or archive the candidate.
7. Confirm no promote, replace, delete, prune, merge, or distill controls exist.

## Future path

A future human-approved promotion path would require a separate PR, explicit review, additional migration/policy review, dry-run proof, and production approval. It is intentionally not implemented here.
