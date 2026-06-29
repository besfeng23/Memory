# Pandora Namespace Isolation

## Purpose

Keep real-life memory and AU/story memory strictly separated.

## Namespaces

- `real_life`: real user, business, legal, financial, relationship, project, production, and personal facts.
- `au`: fictional/AU/story continuity only.

## Rules

- AU/story memory must never be used as real-life evidence.
- Real-life memory must never be stored as AU unless explicitly fictionalized and reviewed.
- Jobs must always specify one namespace at a time.
- Retrieval must filter by namespace before ranking.
- Scoring, pruning, feedback, and contradiction checks must not cross namespaces.
- Tests must include AU-to-real-life contamination checks for any retrieval or scoring change.

## Required checks

Before memory read/write/scoring/pruning:

1. Which namespace is targeted?
2. Is the source real-life or fictional?
3. Could this content contaminate another namespace?
4. Is the operation namespace-scoped in SQL and service logic?

If the namespace is unclear, stop and ask or default to no operation.

## Completion standard

Report the namespace touched and explicitly state whether cross-namespace access was prevented.
