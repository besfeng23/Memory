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
  {
    title: "Typed database foundation",
    status: "implemented",
    description: "Schema-aligned TypeScript database types, typed Supabase clients, and table namespace helpers are present.",
  },
  {
    title: "Repository/service foundation",
    status: "implemented",
    description: "Repository contracts, context helpers, namespace guards, and owned insert preparation are present without public APIs.",
  },
  {
    title: "Safe core repositories",
    status: "implemented",
    description: "Server-side repositories exist for selected core tables with owner and namespace filters.",
  },
  {
    title: "Memory validation foundation",
    status: "implemented",
    description: "Service-layer validators for memory candidates and patch candidates are present without public routes.",
  },
  {
    title: "Memory candidate services",
    status: "implemented",
    description: "Service functions combine validation with safe repositories for memory candidate preparation and internal saving.",
  },
  {
    title: "Logging services",
    status: "implemented",
    description: "Internal services prepare and write retrieval, prompt, and audit logs through safe repositories.",
  },
  {
    title: "Patch service",
    status: "implemented",
    description: "Internal service validates memory patch candidates, writes append-only patch rows, and records audit logs.",
  },
  {
    title: "Retrieval service scaffold",
    status: "implemented",
    description: "Internal owner and namespace filtered memory item retrieval is present without pgvector or public routes.",
  },
];

export const coreImplementationStatus: StatusItem[] = [
  {
    title: "Memory engine",
    status: "planned",
    description: "No public ingest route, extraction runtime, semantic retrieval, or memory timeline behavior is implemented yet.",
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
    description: "Memory patch writes go through an internal create-only service and still expose no public routes.",
  },
  {
    title: "User-owned RLS boundary",
    status: "foundation",
    description: "The database policy layer now has an owner boundary; service-layer validation remains separate.",
  },
  {
    title: "Typed table boundaries",
    status: "foundation",
    description: "Table names and namespace expectations are now represented in reusable TypeScript helpers.",
  },
  {
    title: "Repository service boundary",
    status: "foundation",
    description: "Service helpers prepare owner-bound records from authenticated context before future database operations.",
  },
  {
    title: "Core repository guardrails",
    status: "foundation",
    description: "Core repositories filter by owner and namespace, and still expose no public memory API surface.",
  },
  {
    title: "Memory validator guardrails",
    status: "foundation",
    description: "Memory candidates are checked for namespace, type, source, and patch safety before any future persistence path.",
  },
  {
    title: "Internal candidate service boundary",
    status: "foundation",
    description: "Candidate services are internal-only and do not expose public ingest or patch routes.",
  },
  {
    title: "Internal logging boundary",
    status: "foundation",
    description: "Logging services are internal-only and write through owner-bound repositories without exposing public routes.",
  },
  {
    title: "Internal patch boundary",
    status: "foundation",
    description: "Patch services validate patch candidates and write audit rows without exposing mutation routes.",
  },
  {
    title: "Internal retrieval boundary",
    status: "foundation",
    description: "Retrieval services use owner and namespace repository filters and do not expose public search routes.",
  },
];

export const documentationLinks: StatusItem[] = [
  { title: "Architecture", status: "implemented", description: "System architecture and memory boundaries.", href: `${githubDocsBase}/architecture.md` },
  { title: "Security", status: "implemented", description: "Secrets, RLS, namespace, and audit requirements.", href: `${githubDocsBase}/security.md` },
  { title: "API contracts", status: "implemented", description: "Planned route surface and current route status.", href: `${githubDocsBase}/api-contracts.md` },
  { title: "Auth sessions", status: "implemented", description: "Supabase Auth session boundary and safe session API.", href: `${githubDocsBase}/auth-session.md` },
  { title: "Retrieval service", status: "implemented", description: "Internal owner and namespace filtered retrieval service scaffolding.", href: `${githubDocsBase}/retrieval-service.md` },
  { title: "Patch service", status: "implemented", description: "Internal append-only memory patch service functions.", href: `${githubDocsBase}/patch-service.md` },
  { title: "Logging services", status: "implemented", description: "Internal retrieval, prompt, and audit logging service functions.", href: `${githubDocsBase}/logging-services.md` },
  { title: "Memory candidate services", status: "implemented", description: "Internal service functions for validated memory candidate preparation and saving.", href: `${githubDocsBase}/memory-candidate-services.md` },
  { title: "Memory contracts", status: "implemented", description: "Prompt and behavioral contracts for future memory workflows.", href: `${githubDocsBase}/memory-contracts.md` },
  { title: "Memory validation", status: "implemented", description: "Service-layer memory candidate and patch candidate validation rules.", href: `${githubDocsBase}/memory-validation.md` },
  { title: "Database migrations", status: "implemented", description: "Supabase migration workflow and explicit schema non-goals.", href: `${githubDocsBase}/database-migrations.md` },
  { title: "Database schema", status: "implemented", description: "Core schema tables, namespace columns, and RLS-enabled locked-down tables.", href: `${githubDocsBase}/database-schema.md` },
  { title: "Database types", status: "implemented", description: "Schema-aligned TypeScript database types and table helpers.", href: `${githubDocsBase}/database-types.md` },
  { title: "Core repositories", status: "implemented", description: "Server-side repositories for selected safe core tables.", href: `${githubDocsBase}/core-repositories.md` },
  { title: "Repository foundation", status: "implemented", description: "Repository contracts, context helpers, and service boundary rules.", href: `${githubDocsBase}/repository-service-foundation.md` },
  { title: "RLS policies", status: "implemented", description: "Owner-scoped row-level security policy foundation.", href: `${githubDocsBase}/rls-policies.md` },
  { title: "UI foundation", status: "implemented", description: "UI shell, status honesty, and no-fake-data rules.", href: `${githubDocsBase}/ui-foundation.md` },
];
