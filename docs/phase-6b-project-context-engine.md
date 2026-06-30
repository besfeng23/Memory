# Phase 6B — Project Context Engine

Phase 6B should start only after Phase 6A.2 is deployed to production and the signed-in smoke workflow is accepted.

## Purpose

Phase 6B turns the operating cockpit from a single-session anchor into a durable project context engine.

It should answer:

- What projects are active?
- Which project is currently locked?
- What proof target belongs to each project?
- Which tasks, decisions, constraints, risks, artifacts, and open loops belong to each project?
- What is the one best next action per project?
- Which project is becoming drift?

## Scope

Phase 6B is not prediction yet. It is structured project memory.

Included:

- Project records
- Project status and lifecycle
- Project tasks
- Project decisions
- Project constraints
- Project artifacts
- Project open loops
- Project context snapshot API
- Project context card on `/operating`
- Link work sessions, priority locks, decision gates, OBNA, and raw movement to a project

Not included:

- Gmail
- Calendar
- external connectors
- autonomous actions
- LLM-based prediction
- intervention engine
- AU canon expansion

## Proposed tables

### `operating_projects`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `namespace text not null default 'real_life' check (namespace in ('real_life','au'))`
- `project_key text not null`
- `title text not null`
- `purpose text`
- `status text not null default 'active'`
- `proof_target text`
- `current_phase text`
- `priority integer default 50`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Unique open key:

- unique `(user_id, namespace, project_key)`

### `operating_project_tasks`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `namespace text not null default 'real_life'`
- `project_id uuid references operating_projects(id) on delete cascade`
- `title text not null`
- `description text`
- `status text not null default 'open'`
- `proof_required text`
- `due_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `operating_project_decisions`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `namespace text not null default 'real_life'`
- `project_id uuid references operating_projects(id) on delete cascade`
- `decision text not null`
- `reason text`
- `status text not null default 'active'`
- `source_decision_gate_id uuid references decision_gates(id) on delete set null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `operating_project_constraints`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `namespace text not null default 'real_life'`
- `project_id uuid references operating_projects(id) on delete cascade`
- `constraint_text text not null`
- `severity text not null default 'normal'`
- `status text not null default 'active'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `operating_project_artifacts`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `namespace text not null default 'real_life'`
- `project_id uuid references operating_projects(id) on delete cascade`
- `title text not null`
- `artifact_type text not null default 'note'`
- `uri text`
- `description text`
- `proof_value text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `operating_project_open_loops`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `namespace text not null default 'real_life'`
- `project_id uuid references operating_projects(id) on delete cascade`
- `loop_text text not null`
- `status text not null default 'open'`
- `next_action text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## Service layer

Add `lib/operating/projects.ts` with functions:

- `createOperatingProject`
- `listOperatingProjects`
- `getOperatingProjectByKey`
- `updateOperatingProject`
- `archiveOperatingProject`
- `createProjectTask`
- `updateProjectTask`
- `createProjectDecision`
- `createProjectConstraint`
- `createProjectArtifact`
- `createProjectOpenLoop`
- `getProjectContextSnapshot`

All functions must:

- derive `user_id` from `requireCurrentUserId()`
- preserve namespace isolation
- strip immutable fields from update payloads
- avoid LLM calls
- avoid connectors

## API routes

Proposed routes:

- `GET /api/operating/projects`
- `POST /api/operating/projects`
- `GET /api/operating/projects/[projectKey]`
- `PATCH /api/operating/projects/[projectKey]`
- `GET /api/operating/projects/[projectKey]/context`
- `POST /api/operating/projects/[projectKey]/tasks`
- `PATCH /api/operating/projects/[projectKey]/tasks/[taskId]`
- `POST /api/operating/projects/[projectKey]/decisions`
- `POST /api/operating/projects/[projectKey]/constraints`
- `POST /api/operating/projects/[projectKey]/artifacts`
- `POST /api/operating/projects/[projectKey]/open-loops`

## UI changes

Add to `/operating`:

- Active projects card
- Current project context card
- Project proof target
- Project tasks
- Project decisions
- Project constraints
- Project artifacts
- Project open loops

Add route:

- `/operating/projects`

Optional route later:

- `/operating/projects/[projectKey]`

## Acceptance criteria

Phase 6B is done only when:

1. Phase 6A.2 production smoke has passed.
2. Migration applies cleanly.
3. RLS exists on all new tables.
4. API routes derive user identity server-side.
5. `/operating/projects` lets the signed-in user create and view projects.
6. Project context snapshot returns tasks, decisions, constraints, artifacts, open loops, and proof target.
7. Work sessions and priority locks can reference `project_key` consistently.
8. CI passes.
9. Vercel production deploys.
10. Docs clearly state this is project context, not prediction or autonomous action.

## Build order

1. Migration only.
2. Types and schemas.
3. Project service layer.
4. API routes.
5. `/operating/projects` UI.
6. Add project context card to `/operating`.
7. Docs and proof report.
8. CI and deployment verification.

## Guardrail

Do not implement Phase 6C prediction until project context exists and is manually verified.
