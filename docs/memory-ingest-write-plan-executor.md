# Memory ingest write-plan executor contract

The memory ingest write-plan executor is a **dry-run executor only**. It simulates the ordered execution of the append-only operations produced by the write-plan builder and returns a structured execution report. It does not activate production ingest and must not be used as a live memory writer.

## What the dry-run executor does

- Validates the authenticated repository context before any simulated execution.
- Enforces that the request namespace, repository context namespace, and write-plan namespace all match.
- Uses the repository context user ID as the ownership boundary; client-supplied `user_id` or `userId` metadata is never trusted.
- Keeps `real_life` and `au` namespace handling explicit.
- Treats AU/story content as fictional story-scoped data only; AU data must never become real-life evidence.
- Validates the future append-only operation order:
  1. `validate_namespace_boundary`
  2. `insert_memory_source`
  3. `insert_memory_item`
  4. `insert_memory_patch`
  5. `insert_audit_log`
  6. `finalize_idempotency_record`
- Blocks plans that are missing operations, contain unknown operations, contain out-of-order operations, are already blocked, attempt immediate writes, mismatch ownership, or mismatch namespace boundaries.
- Returns executed operation metadata with `mode: "dry_run_execute_only"`, `appendOnly: true`, and `writesNow: false` when the simulation is valid.

## What it explicitly does not do

- It does **not** write memory rows.
- It does **not** call Supabase `insert`, `update`, or `delete`.
- It does **not** call OpenAI or any other model provider.
- It does **not** perform retrieval.
- It does **not** add pgvector, GPT Actions, MCP, seed data, or fake production memory rows.
- It does **not** enable the public `/api/memory/ingest` route as a production write path.

## Future real implementation requirements

A future real executor must execute the validated plan transactionally and idempotently. It must preserve append-only behavior, avoid silent overwrites, keep audit logging explicit, and treat namespace isolation as mandatory. Real writes must continue to use authenticated repository context as the ownership boundary, never client-supplied user IDs.
