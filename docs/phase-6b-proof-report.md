# Phase 6B Proof Report

## Scope

Phase 6B adds the first Project Context Engine foundation.

Included:

- additive Supabase migration for project context tables
- owner-scoped RLS policies
- project context service layer
- project context schemas
- REST APIs for projects and child records
- `/operating/projects` UI
- topbar Projects link

## New tables

- `operating_projects`
- `operating_project_tasks`
- `operating_project_decisions`
- `operating_project_constraints`
- `operating_project_artifacts`
- `operating_project_open_loops`

## New API routes

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

## UI route

- `/operating/projects`

## Manual smoke plan

1. Sign in.
2. Open `/operating/projects`.
3. Create a project.
4. Confirm the project appears in the list.
5. Select the project.
6. Confirm context sections render: tasks, decisions, constraints, artifacts, and open loops.
7. Fetch `/api/operating/projects` while signed in.
8. Fetch `/api/operating/projects/[projectKey]/context` while signed in.

## Acceptance

Phase 6B foundation is accepted when:

- CI passes.
- Vercel builds.
- Supabase migration is applied.
- `/operating/projects` loads in production.
- A signed-in user can create and view a project.
- Project context snapshot returns all five child sections.

## Preview retry

- 2026-07-01T03:48:00Z — docs-only retry to request a fresh Vercel preview build after build-rate-limit.
