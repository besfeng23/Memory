const githubDocsBase = "https://github.com/besfeng23/Memory/blob/main/docs";

export type ProjectStatus = "implemented" | "foundation" | "planned" | "stubbed" | "blocked";

export type StatusItem = {
  title: string;
  status: ProjectStatus;
  description: string;
  href?: string;
};

export const completedPrompts: StatusItem[] = [
  {
    title: "Foundation app",
    status: "implemented",
    description: "Next.js App Router foundation, shared layout shell, health route, and base styling are present.",
  },
  {
    title: "Operating documentation and contracts",
    status: "implemented",
    description: "Architecture, security, API, memory, environment, and coding standards are documented as implementation contracts.",
    href: "https://github.com/besfeng23/Memory/tree/main/docs",
  },
  {
    title: "Supabase migration workflow",
    status: "implemented",
    description: "Supabase CLI scripts and placeholder migration workflow are prepared without production memory schema.",
  },
  {
    title: "Auth/session structure",
    status: "implemented",
    description: "Supabase Auth helpers, magic-link login, callback, logout, and safe session status API are present.",
  },
  {
    title: "Core database schema migration",
    status: "implemented",
    description: "Initial Supabase migration defines core, real-life, and AU/story tables with row-level protection enabled.",
  },
  {
    title: "RLS policy foundation",
    status: "implemented",
    description: "Owner-scoped row-level security rules exist for user-owned core, real-life, and AU/story tables.",
  },
];

export const coreImplementationStatus: StatusItem[] = [
  {
    title: "Memory engine",
    status: "planned",
    description: "No ingest, extraction, retrieval, validation, patching, or memory timeline behavior is implemented yet.",
  },
  {
    title: "pgvector retrieval",
    status: "planned",
    description: "The pgvector extension, embedding tables, vector indexes, and semantic retrieval are not enabled.",
  },
  {
    title: "OpenAI integration",
    status: "planned",
    description: "Responses API calls, embeddings, extraction prompts, and model-backed memory workflows are not implemented.",
  },
  {
    title: "AU continuity engine",
    status: "planned",
    description: "Canon guardrails, scene aftermath, retcons, character state, and AU relationship state are schema-ready but not implemented as behavior.",
  },
  {
    title: "GPT Actions",
    status: "planned",
    description: "The Custom GPT Actions OpenAPI schema and action routes are not implemented.",
  },
  {
    title: "MCP server",
    status: "planned",
    description: "The optional remote MCP tools are planned and must later share the same validated service layer as REST APIs.",
  },
];

export const safetyRules: StatusItem[] = [
  {
    title: "Database is source of truth",
    status: "foundation",
    description: "Pandora will treat its own Supabase Postgres database as durable memory, not ChatGPT built-in memory.",
  },
  {
    title: "Namespace isolation",
    status: "foundation",
    description: "Real-life and AU/story memory must remain separated in every future query, write, and UI state.",
  },
  {
    title: "No fake memory data",
    status: "foundation",
    description: "Foundation UI must not invent people, worlds, relationships, promises, risks, deals, scenes, metrics, or audit logs.",
  },
  {
    title: "Append-only memory changes",
    status: "foundation",
    description: "Schema includes append-only memory patch and audit log tables; service behavior is still planned.",
  },
  {
    title: "User-owned RLS boundary",
    status: "foundation",
    description: "The database policy layer now has an owner boundary; service-layer validation remains planned.",
  },
];

export const documentationLinks: StatusItem[] = [
  { title: "Architecture", status: "implemented", description: "System architecture and memory boundaries.", href: `${githubDocsBase}/architecture.md` },
  { title: "Security", status: "implemented", description: "Secrets, RLS, namespace, and audit requirements.", href: `${githubDocsBase}/security.md` },
  { title: "API contracts", status: "implemented", description: "Planned route surface and current route status.", href: `${githubDocsBase}/api-contracts.md` },
  { title: "Auth sessions", status: "implemented", description: "Supabase Auth session boundary and safe session API.", href: `${githubDocsBase}/auth-session.md` },
  { title: "Memory contracts", status: "implemented", description: "Prompt and behavioral contracts for future memory workflows.", href: `${githubDocsBase}/memory-contracts.md` },
  { title: "Database migrations", status: "implemented", description: "Supabase migration workflow and explicit schema non-goals.", href: `${githubDocsBase}/database-migrations.md` },
  { title: "Database schema", status: "implemented", description: "Core schema tables, namespace columns, and RLS-enabled locked-down tables.", href: `${githubDocsBase}/database-schema.md` },
  { title: "RLS policies", status: "implemented", description: "Owner-scoped row-level security policy foundation.", href: `${githubDocsBase}/rls-policies.md` },
  { title: "UI foundation", status: "implemented", description: "UI shell, status honesty, and no-fake-data rules.", href: `${githubDocsBase}/ui-foundation.md` },
];
