# Supabase RLS Check Skill

Use this skill when reviewing or verifying Supabase reads, writes, auth, RLS policies, repositories, or migrations.

## Goal

Ensure Pandora memory data is scoped to the authenticated user and cannot be read or written publicly.

## Checklist

1. Auth source
   - Supabase Auth session is used.
   - User identity is server-derived or RLS-derived.
   - Client-supplied user ids are not trusted.

2. Browser safety
   - No service-role key is present in client code.
   - Browser code uses publishable/anon key only.
   - Sensitive rows are not exposed by public route.

3. Server safety
   - Server reads are session-gated.
   - Admin/internal reads are explicit and gated.
   - Service-role access, if ever used, must be server-only and reviewed.

4. RLS behavior
   - Unauthenticated users cannot read memory rows.
   - Authenticated users can only read their own rows.
   - Namespace filters do not bypass ownership.
   - Writes require review and audit path.

5. Database proof
   - Memory item exists.
   - Source row exists.
   - Patch row exists.
   - Audit row exists.
   - Counts match expected proof.

## Output format

Return:

- Tables/policies checked
- Auth method
- Read result
- Write risk
- RLS verdict
- Missing proof

Do not run destructive SQL. Use migrations for DDL, and never expose query results containing secrets.
