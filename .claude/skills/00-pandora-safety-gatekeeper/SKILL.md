# Pandora Safety Gatekeeper

## Purpose

Prevent unsafe memory operations, secret exposure, namespace contamination, and premature production rollout.

## When to use

Use this skill before any Pandora Memory task that touches memory persistence, retrieval, pruning, scoring, Supabase, environment variables, internal jobs, or production deployment.

## Non-negotiable rules

- Never print, echo, log, screenshot, commit, or expose secrets.
- Never ask the user to paste tokens into chat.
- Never run `dryRun:false` unless the user explicitly approves after reviewing dry-run output.
- Never enable pruning by default.
- Never mutate production memory without a reviewed dry-run.
- Never mix `real_life` and `au` namespaces.
- Never trust client-supplied `user_id` for memory writes.
- Never weaken RLS, route protection, or server-only secret boundaries.
- Never claim a phase is complete unless there is merge, migration, deployment, and endpoint evidence as applicable.

## Required safety checkpoint

Before acting, state internally:

1. What could mutate data?
2. What could expose secrets?
3. What namespace is targeted?
4. Is this dry-run or real execution?
5. Is human approval required first?

If any answer is unclear, stop and ask for clarification or produce a safe read-only plan.

## Completion standard

Report what was actually done, what was not done, what evidence proves it, and the next exact safe step.
