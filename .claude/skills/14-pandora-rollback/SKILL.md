# Pandora Rollback

## Purpose

Create a rollback plan before risky Pandora changes, especially production deploys, migrations, scoring persistence, and pruning behavior.

## Rollback questions

Before rollout, answer:

1. What code changed?
2. What database schema changed?
3. Did any data rows change?
4. Can code be reverted independently?
5. Is the migration additive or reversible?
6. Are writes idempotent?
7. What is the last known good deployment?
8. What monitoring proves rollback worked?

## Rules

- Additive nullable columns usually do not require immediate reversal.
- Destructive migrations require explicit backup/restore and approval.
- Scoring writes must be reproducible or clearable by version if rollback is needed.
- Pruning must remain review-only unless an apply/rollback path exists.
- Never run irreversible operations without a backup and approval.

## Rollback plan format

- Last known good commit/deployment.
- Revert command or PR path.
- Migration/data rollback notes.
- Verification commands.
- Risks that cannot be undone.

## Completion standard

No risky rollout is approved without a clear rollback path or an explicit statement that rollback is not safely possible.
