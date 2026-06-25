# Memory Safety Review Skill

Use this skill when reviewing any change that touches memory, auth, database access, persistence, retrieval, prompts, agent instructions, or deployment gates.

## Goal

Prevent unsafe memory behavior and prevent false claims about what Pandora can do.

## Checklist

1. Confirm the change does not enable prohibited gates:
   - public memory reads
   - public memory persistence
   - production ingest writes unless explicitly reviewed
   - model calls
   - embeddings
   - semantic retrieval
   - GPT Actions
   - MCP
   - batch memory append
   - automatic memory writes without review

2. Confirm namespace separation:
   - `real_life` stays for real evidence-backed facts.
   - `au` stays for fictional/AU/story continuity.
   - No AU content is used as real-life evidence.

3. Confirm identity safety:
   - No client-supplied user id is trusted.
   - Reads/writes are tied to server-derived or RLS-derived identity.
   - No service-role key is used in browser code.
   - No RLS bypass is introduced.

4. Confirm persistence safety:
   - writes are reviewed
   - append-only
   - source-backed
   - patch-backed
   - audit-backed
   - idempotent

5. Confirm secrets safety:
   - no `.env` or local secrets are read into output
   - no operator tokens are printed
   - no secret placeholders are converted into real-looking values

## Output format

Return:

- Verdict: safe / needs changes / blocked
- Files reviewed
- Gates touched
- RLS/auth impact
- Persistence impact
- Required follow-up

Do not claim safety if any required evidence is missing.
