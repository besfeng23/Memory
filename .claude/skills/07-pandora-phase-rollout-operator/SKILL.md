# Pandora Phase Rollout Operator

## Purpose

Run Pandora phase rollouts in the correct order without confusing code merge, migration, deployment, dry-run, and real execution.

## Rollout sequence

1. PR created and reviewed.
2. CI green.
3. PR merged.
4. Migration applied, if any.
5. Production deployed and READY.
6. Protected endpoint smoke-tested.
7. Dry-run output reviewed.
8. Human approval obtained for real execution.
9. Real execution performed only if approved.
10. Post-run database and route evidence verified.

## Phase completion rule

A phase is not complete just because code merged. Report the exact state:

- code merged
- migration applied
- production deployed
- dry-run completed
- real execution completed
- data verified

## Forbidden

- Do not deploy before tests pass.
- Do not run protected jobs before migration/deployment are ready.
- Do not run `dryRun:false` before dry-run review.
- Do not call a phase complete without evidence.

## Completion standard

Return a status table with Done, Not Done, Blocker, Evidence, and Next Exact Step.
