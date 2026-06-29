# Pandora Architecture Boundary

## Purpose

Keep Pandora maintainable by enforcing clear boundaries between routes, services, config, Supabase access, UI, and tests.

## Boundary rules

- Routes stay thin.
- Business logic belongs in `lib/services`.
- Runtime gates and env parsing belong in `lib/config` or approved env services.
- Supabase access goes through approved server/client helpers.
- Client components must not import server-only code or secrets.
- Database shape changes belong in migrations.
- UI components should not contain scoring/pruning business logic.
- Tests should cover service behavior, route protection, and migration assumptions.

## Forbidden

- No giant all-in-one route handlers.
- No duplicated scoring/pruning formulas across files.
- No service-role key usage in browser/client code.
- No direct production mutation from UI without server-side gates.
- No hidden model/embedding calls inside retrieval unless gates are explicit.

## Review checklist

- Is the logic in the correct layer?
- Are gates resolved once and passed clearly?
- Is identity server-derived or RLS-derived?
- Are errors typed and safe to show?
- Are tests placed near the behavior they protect?

## Completion standard

Report any boundary violations and refactor recommendations before approving a PR.
