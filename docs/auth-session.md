# Auth and Session Boundary

Pandora Memory Engine uses Supabase Auth for authentication. This document describes the current auth/session foundation only; it does not create application profile tables, memory schema, RLS policies, pgvector, OpenAI calls, or memory APIs.

## Current Implementation

- Supabase browser clients use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server helpers in `lib/security/auth.ts` and `lib/security/session.ts` read the current Supabase Auth user and session from server-side request cookies.
- API helpers in `lib/security/api-auth.ts` provide JSON-safe unauthenticated and forbidden responses for future protected routes.
- `/auth/login` provides a foundation magic-link sign-in form using the public Supabase anon key.
- `/auth/callback` exchanges a Supabase callback code for a server-managed session and redirects to `/dashboard` on success.
- `/auth/logout` signs out the current Supabase session server-side and redirects to `/auth/login`.
- `/api/session` returns public session status only.
- `/api/health` remains public.

## Ownership Boundary

The authenticated Supabase user ID is the future ownership boundary for Pandora data. Future memory APIs must derive `user_id` from the authenticated server session. They must not trust `user_id` values submitted by clients in request bodies, query strings, headers, or route parameters when a session exists.

## Safe Session API Shape

`GET /api/session` returns only:

- `authenticated`
- `user.id`
- `user.email` when Supabase provides one
- `user.created_at` when Supabase provides one

It must not return access tokens, refresh tokens, raw Supabase session objects, service role keys, database URLs, OpenAI keys, Actions keys, MCP tokens, or other secrets.

## Server-Side Secrets

`SUPABASE_SERVICE_ROLE_KEY` remains server-side only. It must not be imported into client components, browser helpers, or public bundles. The current auth foundation does not require the service role key.

## Dashboard Scope

The dashboard currently shows foundation and auth status. It may show whether the current request is authenticated, but it does not expose memory data, fake users, fake profiles, fake roles, fake permissions, fake audit logs, or fake memory records.

## Explicit Non-Goals

The current auth/session structure does not include:

- Application profile tables.
- Memory tables.
- Production database schema.
- RLS policies.
- pgvector.
- OpenAI calls.
- Memory ingest, search, extraction, validation, patching, retrieval, or timeline APIs.
- Fake users or fake memory records.
