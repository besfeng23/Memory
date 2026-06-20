# Memory Review Queue RLS Read-only Foundation

This PR adds the RLS-safe Supabase review queue persistence foundation. Review queue persistence is separate from memory persistence: review items can be stored/read for a user-owned queue, but approved review items still do **not** persist memory.

## Safety boundaries

- API routes are read-only by design and return disabled responses for mutation attempts.
- Approval actions remain disabled; public routes cannot approve, reject, archive, append decisions, or persist approved memory.
- User ownership is enforced twice: Supabase RLS uses `auth.uid()`, and repository code derives `userId` only from `RepositoryContext` created from server auth.
- Client-supplied `user_id` / `userId` is rejected and never trusted.
- Namespace isolation remains mandatory and explicit for `real_life` and `au`.
- AU/story data cannot become real-life evidence.
- Real-life memory cannot enter AU unless explicitly fictionalized and reviewed.
- Review decisions remain append-only. Delete behavior is not exposed; archive is the intended future path.
- This PR introduces no model calls, retrieval, embeddings, pgvector, GPT Actions, MCP, or production memory writes.

## Roadmap

Added now: RLS-safe review queue storage/read foundation, mapper validation, read-only route factory, disabled public route wiring, and safe read-only UI state.

Next step: implement a review decision append RPC and controlled internal review mutation path. That remains separate from production memory persistence and must continue to avoid automatic approved-memory writes.
