# Pull Request Review Skill

Use this skill when reviewing a Pandora Memory Engine PR.

## Goal

Decide whether a PR is safe to merge and whether it changes phase status.

## Review order

1. Read PR title, body, branch, base, and status.
2. List changed files.
3. Inspect diffs for memory, auth, RLS, gates, env, deployment, or agent instruction impact.
4. Check CI and Vercel status.
5. Check whether any failure is code-related or quota/platform-related.
6. Decide merge readiness.

## Merge readiness checklist

A PR is merge-ready when:

- it is mergeable
- it does not introduce unsafe gates
- it does not expose secrets
- it does not bypass RLS
- it does not use service-role keys in browser code
- tests/checks are passing or failures are clearly unrelated platform limits
- phase claims are honest

## Output format

Return:

- PR number and title
- State and mergeability
- Changed files
- Checks
- Safety impact
- Phase impact
- Recommendation: merge / wait / request changes

## Important rule

Do not say a deployment is verified when Vercel failed due quota or no live route was checked.
