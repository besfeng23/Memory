import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentUserId } from "@/lib/security/auth";
import type { PandoraNamespace } from "@/lib/supabase/database.types";

type QueryChain = {
  select(columns?: string): QueryChain;
  insert(values: Record<string, unknown> | Record<string, unknown>[]): QueryChain;
  update(values: Record<string, unknown>): QueryChain;
  eq(column: string, value: unknown): QueryChain;
  order(column: string, options?: { ascending?: boolean }): QueryChain;
  limit(count: number): QueryChain;
  maybeSingle(): Promise<{ data: unknown; error: { message: string } | null }>;
  single(): Promise<{ data: unknown; error: { message: string } | null }>;
  then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
};

type ProjectDb = { from(table: string): QueryChain };

type OperatingProject = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  project_key: string;
  title: string;
  purpose: string | null;
  status: string;
  proof_target: string | null;
  current_phase: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
};

type ProjectContextSnapshot = {
  project: OperatingProject;
  tasks: Array<Record<string, unknown>>;
  decisions: Array<Record<string, unknown>>;
  constraints: Array<Record<string, unknown>>;
  artifacts: Array<Record<string, unknown>>;
  openLoops: Array<Record<string, unknown>>;
};

const IMMUTABLE_UPDATE_FIELDS = new Set(["id", "user_id", "namespace", "project_id", "created_at", "updated_at"]);

function asProjectDb(client: unknown): ProjectDb {
  return client as ProjectDb;
}

async function db() {
  return asProjectDb(await createSupabaseServerClient());
}

function normalizeNamespace(namespace?: PandoraNamespace): PandoraNamespace {
  return namespace ?? "real_life";
}

function normalizeProjectKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function sanitizeUpdate(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => value !== undefined && !IMMUTABLE_UPDATE_FIELDS.has(key)));
}

function throwIfError(error: { message: string } | null, action: string) {
  if (error) throw new Error(`${action} failed: ${error.message}`);
}

async function requireProjectByKey(projectKey: string, namespace: PandoraNamespace = "real_life") {
  const project = await getOperatingProjectByKey(projectKey, namespace);
  if (!project) throw new Error(`Project not found: ${projectKey}`);
  return project;
}

export async function createOperatingProject(input: {
  namespace?: PandoraNamespace;
  project_key: string;
  title: string;
  purpose?: string;
  proof_target?: string;
  current_phase?: string;
  priority?: number;
  status?: string;
}) {
  const userId = await requireCurrentUserId();
  const namespace = normalizeNamespace(input.namespace);
  const client = await db();
  const { data, error } = await client
    .from("operating_projects")
    .insert({
      user_id: userId,
      namespace,
      project_key: normalizeProjectKey(input.project_key),
      title: input.title,
      purpose: input.purpose ?? null,
      proof_target: input.proof_target ?? null,
      current_phase: input.current_phase ?? null,
      priority: input.priority ?? 50,
      status: input.status ?? "active",
    })
    .select("*")
    .single();

  throwIfError(error, "createOperatingProject");
  return data as OperatingProject;
}

export async function listOperatingProjects(namespace: PandoraNamespace = "real_life", limit = 20) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("operating_projects")
    .select("*")
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  throwIfError(error, "listOperatingProjects");
  return (data ?? []) as OperatingProject[];
}

export async function getOperatingProjectByKey(projectKey: string, namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("operating_projects")
    .select("*")
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .eq("project_key", normalizeProjectKey(projectKey))
    .limit(1)
    .maybeSingle();

  throwIfError(error, "getOperatingProjectByKey");
  return data as OperatingProject | null;
}

export async function updateOperatingProject(projectKey: string, input: Record<string, unknown>, namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("operating_projects")
    .update(sanitizeUpdate(input))
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .eq("project_key", normalizeProjectKey(projectKey))
    .select("*")
    .single();

  throwIfError(error, "updateOperatingProject");
  return data as OperatingProject;
}

export async function createProjectTask(projectKey: string, input: Record<string, unknown>, namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const project = await requireProjectByKey(projectKey, namespace);
  const client = await db();
  const { data, error } = await client.from("operating_project_tasks").insert({ user_id: userId, namespace, project_id: project.id, ...input }).select("*").single();
  throwIfError(error, "createProjectTask");
  return data;
}

export async function updateProjectTask(taskId: string, input: Record<string, unknown>) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client.from("operating_project_tasks").update(sanitizeUpdate(input)).eq("id", taskId).eq("user_id", userId).select("*").single();
  throwIfError(error, "updateProjectTask");
  return data;
}

export async function createProjectDecision(projectKey: string, input: Record<string, unknown>, namespace: PandoraNamespace = "real_life") {
  return createProjectChild("operating_project_decisions", projectKey, input, namespace);
}

export async function createProjectConstraint(projectKey: string, input: Record<string, unknown>, namespace: PandoraNamespace = "real_life") {
  return createProjectChild("operating_project_constraints", projectKey, input, namespace);
}

export async function createProjectArtifact(projectKey: string, input: Record<string, unknown>, namespace: PandoraNamespace = "real_life") {
  return createProjectChild("operating_project_artifacts", projectKey, input, namespace);
}

export async function createProjectOpenLoop(projectKey: string, input: Record<string, unknown>, namespace: PandoraNamespace = "real_life") {
  return createProjectChild("operating_project_open_loops", projectKey, input, namespace);
}

async function createProjectChild(table: string, projectKey: string, input: Record<string, unknown>, namespace: PandoraNamespace) {
  const userId = await requireCurrentUserId();
  const project = await requireProjectByKey(projectKey, namespace);
  const client = await db();
  const { data, error } = await client.from(table).insert({ user_id: userId, namespace, project_id: project.id, ...input }).select("*").single();
  throwIfError(error, table);
  return data;
}

export async function getProjectContextSnapshot(projectKey: string, namespace: PandoraNamespace = "real_life"): Promise<ProjectContextSnapshot> {
  const project = await requireProjectByKey(projectKey, namespace);
  const client = await db();
  const [tasks, decisions, constraints, artifacts, openLoops] = await Promise.all([
    client.from("operating_project_tasks").select("*").eq("project_id", project.id).order("updated_at", { ascending: false }).limit(20),
    client.from("operating_project_decisions").select("*").eq("project_id", project.id).order("updated_at", { ascending: false }).limit(20),
    client.from("operating_project_constraints").select("*").eq("project_id", project.id).order("updated_at", { ascending: false }).limit(20),
    client.from("operating_project_artifacts").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(20),
    client.from("operating_project_open_loops").select("*").eq("project_id", project.id).order("updated_at", { ascending: false }).limit(20),
  ]);

  throwIfError(tasks.error, "listProjectTasks");
  throwIfError(decisions.error, "listProjectDecisions");
  throwIfError(constraints.error, "listProjectConstraints");
  throwIfError(artifacts.error, "listProjectArtifacts");
  throwIfError(openLoops.error, "listProjectOpenLoops");

  return {
    project,
    tasks: (tasks.data ?? []) as Array<Record<string, unknown>>,
    decisions: (decisions.data ?? []) as Array<Record<string, unknown>>,
    constraints: (constraints.data ?? []) as Array<Record<string, unknown>>,
    artifacts: (artifacts.data ?? []) as Array<Record<string, unknown>>,
    openLoops: (openLoops.data ?? []) as Array<Record<string, unknown>>,
  };
}
