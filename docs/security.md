# Security Requirements

Pandora Memory Engine handles sensitive real-life memory and fictional AU/story continuity. Security controls must be implemented before production memory features are treated as live.

## Supabase RLS

Supabase Row Level Security must be enabled on every user-owned table. Policies must ensure users can only access their own rows and cannot bypass namespace isolation.

## Required Row Ownership Fields

Every user-owned data row must include `user_id`. Every memory row must include `namespace`. API routes must not trust a client-supplied `user_id` when an authenticated server session is available.

## Namespace Query Isolation

AU/story and real-life namespaces must be query-isolated. Namespace filters are required before semantic ranking, keyword matching, timeline loading, context packing, or generation. AU records must never appear in real-life retrieval. Real-life records must never enter AU retrieval unless the request explicitly allows fictionalized use and the output marks it as fictionalized.

## Server-Side Secrets Only

The Supabase service role key is server-side only. The OpenAI API key is server-side only. No server secret may be imported into React components, client components, browser utilities, or public bundles.

No secret may use a `NEXT_PUBLIC_` prefix unless it is intentionally public and safe to expose in a browser. `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `POSTGRES_*`, `SUPABASE_JWT_SECRET`, `OPENAI_API_KEY`, `PANDORA_ACTIONS_API_KEY`, and `MCP_SERVER_TOKEN` must never be exposed with `NEXT_PUBLIC_`.

## Audit and Retrieval Logging

Every write must create an audit log. Every memory retrieval must create a retrieval log. Logs must include the actor, namespace, operation, affected records, timestamp, validation result, and enough context to debug contamination or unauthorized access.

## Delete Policy

Soft delete is the default. Soft delete should mark rows inactive, deleted, disputed, or superseded without erasing history.

Hard delete is only allowed as an explicit admin action. Hard delete must be audited and should not be available through normal memory write flows.

## Write Validation

No memory may be silently overwritten. Every write must go through validation before patching. Validation must check namespace, user ownership, source confidence, memory type, contradictions, AU canon rules, real-life evidence rules, and whether the operation is append-only.

## Client Boundary

Client components may use only public values such as `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. They must never read service role credentials, OpenAI credentials, database URLs, JWT secrets, Actions keys, or MCP tokens.
