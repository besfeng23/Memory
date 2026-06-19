# Testing

Pandora Memory Engine uses Vitest as the base test runner for fast unit tests around foundation contracts, UI honesty, auth boundaries, and future memory-safety rules.

The current test layer protects foundation behavior only. It does not require Supabase local database, production Supabase credentials, OpenAI credentials, pgvector, RLS, or real memory data.

## Commands

```bash
npm run test
npm run test:watch
npm run ci
```

`npm run ci` runs typecheck, lint, tests, and production build in sequence.

## Current Coverage

Current tests cover:

- Project status metadata.
- Planned-vs-implemented feature labels.
- Navigation status honesty.
- Reusable status badge rendering.
- JSON-safe API auth error responses.
- Safe `/api/session` response shape.

These tests must not display, insert, or depend on fake users, fake people, fake AU worlds, fake relationships, fake business deals, fake risks, fake promises, fake audit logs, or fake memory rows.

## CI Rules

GitHub Actions CI runs on pull requests and pushes to `main`.

CI must:

- Use `npm ci`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run test`.
- Run `npm run build`.
- Avoid production secrets.
- Avoid production Supabase connections.
- Avoid `db:push` and any production database command.

## Future Required Tests

Future implementation tasks must add tests for:

- Real-life vs AU/story namespace isolation.
- Authenticated user ownership boundaries.
- RLS behavior.
- Append-only memory patching.
- Audit logging.
- Retrieval logging.
- AU canon guard behavior.
- Real-life evidence handling.
- Source confidence and uncertainty handling.
- No silent overwrites.

A memory feature is not complete until tests prove it cannot cross-contaminate real-life and AU/story data, cannot trust client-submitted `user_id`, and cannot imply fake operational behavior in the UI.
