# UI Foundation

Pandora Memory Engine uses a light-mode-first application shell that should feel like a serious operating system for memory management. The UI should be premium, calm, legible, and scalable. It must not become sci-fi themed, childish, noisy, or decorative at the expense of clarity.

## Light-Mode-First Rule

The default interface is light mode. Future dark mode support is allowed, but it must not weaken contrast, status readability, or the professional operating-system feel.

## Status Honesty Rule

Every feature surface must distinguish between:

- **Implemented:** real behavior exists in the codebase.
- **Foundation:** supporting shell, contracts, or structure exists, but the production feature is not live.
- **Planned:** no implementation exists yet.
- **Stubbed:** a route or component exists but intentionally returns placeholder behavior.
- **Blocked:** work cannot proceed until a dependency is resolved.

Unimplemented memory features must be visibly marked as planned, foundation-only, stubbed, or blocked. A page must never imply that a planned feature is operating.

## Fake Data Is Forbidden

Pandora is evidence-sensitive. Fake examples can mislead users into believing memory has been retrieved, audited, or validated. Until real schema, RLS, retrieval, and APIs exist, UI pages must not show fake people, fake AU worlds, fake relationships, fake scenes, fake business deals, fake risks, fake promises, fake memory counts, fake source confidence, or fake audit logs.

Use empty states and status badges instead of mock operational data.

## Shared Components

Future pages should reuse the foundation components before creating page-specific markup:

- `StatusBadge` for implemented/foundation/planned/stubbed/blocked labels.
- `SectionCard` for grouped dashboard and settings content.
- `EmptyState` for honest unavailable states.
- `PageHeader` for page titles, explanations, and primary actions.

Navigation metadata belongs in `components/layout/nav-items.ts` so route labels and planned status stay centralized.

## Avoiding Implied Memory Behavior

Future UI pages must not suggest that Pandora can search, ingest, validate, retrieve, patch, audit, or summarize memory until those backend services are implemented. Planned pages may describe intended behavior, but they must use explicit planned labels and avoid live-looking tables, charts, counters, timelines, relationship maps, world cards, or audit feeds.

When a feature becomes real, the page should cite the implemented API or service layer, enforce namespace separation, and keep real-life and AU/story data visually and technically separated.
