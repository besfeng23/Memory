# Phase 4A: Controlled operator-approved memory persistence

Phase 4A exists to make Pandora Memory able to create memory only through a reviewed operator workflow. Phase 3F closed the read-only foundation: authenticated admin readback, admin browser, audit route, public-read blocking, and dangerous runtime gates disabled.

## What Phase 4A adds

- Pending `memory_proposals` records.
- Operator review actions: approve, reject, request revision, persist approved proposal.
- Append-only writes to active memory only after approval.
- Audit events for proposal lifecycle actions.
- Admin UI under `/admin/memory/proposals`.

## Proposal lifecycle

1. Authenticated operator creates a pending proposal.
2. Proposal is not active memory.
3. Authenticated operator approves, rejects, or requests revision.
4. Only an approved proposal can be persisted.
5. Persistence links the proposal to a memory item and writes source, patch, and audit proof.

## Env gates

`PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE=true` is required for all mutations. The default is disabled. Public reads and public writes remain disabled.

## RLS expectations

`memory_proposals` is RLS-enabled. Authenticated users can access only their own namespace-scoped proposal rows. App routes must use server-derived Supabase Auth identity and must not use service-role clients.

## Audit requirements

Lifecycle events include `proposal_created`, `proposal_approved`, `proposal_rejected`, `proposal_needs_revision`, `proposal_persisted`, and `proposal_disabled` if disabling is used later.

## Manual verification checklist

- Confirm `/admin/memory/verification` says read-only foundation remains closed.
- Confirm Phase 4A is disabled when the reviewed write gate is absent.
- Enable the reviewed write gate in a reviewed environment.
- Create a pending proposal as an authenticated operator.
- Approve it.
- Persist it.
- Confirm the row appears in `/admin/memory/browser?namespace=real_life`.
- Confirm audit events exist.
- Confirm `/memory/browser` redirects and never renders public rows.

## Rollback/no-close rules

Do not close Phase 4A if proposal mutation is public, unauthenticated, unaudited, not namespace-scoped, or bypasses RLS. Roll back by disabling `PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE`.

## Must remain disabled

- Public reads
- Public writes
- Model calls
- Embeddings
- Semantic retrieval
- GPT Actions
- MCP
