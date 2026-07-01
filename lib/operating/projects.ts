import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentUserId } from "@/lib/security/auth";
import type { PandoraNamespace } from "@/lib/supabase/database.types";
import type {
  OperatingProject,
  OperatingProjectArtifact,
  OperatingProjectConstraint,
  OperatingProjectDecision,
  OperatingProjectOpenLoop,
  OperatingProjectTask,
  ProjectContextSnapshot,
} from "@/lib/operating/project-types";

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

type ProjectDb = {
  from(table: string): QueryChain;
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

function throwIfError(error: { message: string } | null, action: string) {
  if (error) {
    throw new Error(`${action} failed: ${error.message}`);
  }
}

function sanitizeUpdate(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => value !== undefined && !IMMUTABLE_UPDATE_FIELDS.has(key)));
}

function normalizeProjectKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function requireProjectByKey(projectKey: string, namespace: PandoraNamespace = "real_life") {
  const project = await getOperatingProjectByKey(projectKey, namespace);
  if (!project) {
    throw new Error(`Project not found: ${projectKey}`);
  }
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
  const projectKey = normalizeProjectKey(input.project_key);
  const client = await db();
  const { data, error } = await client
    .from("operating_projects")
    .insert({
      user_id: userId,
      namespace,
      project_key: projectKey,
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

export async function archiveOperatingProject(projectKey: string, namespace: PandoraNamespace = "real_life") {
  return updateOperatingProject(projectKey, { status: "archived" }, namespace);
}

export async function createProjectTask(projectKey: string, input: {
  title: string;
  description?: string;
  status?: string;
  proof_required?: string;
  due_at?: string;
}, namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const project = await requireProjectByKey(projectKey, namespace);
  const client = await db();
  const { data, error } = await client
    .from("operating_project_tasks")
    .insert({
      user_id: userId,
      namespace,
      project_id: project.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "open",
      proof_required: input.proof_required ?? null,
      due_at: input.due_at ?? null,
    })
    .select("*")
    .single();

  throwIfError(error, "createProjectTask");
  return data as OperatingProjectTask;
}

export async function updateProjectTask(taskId: string, input: Record<string, unknown>) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("operating_project_tasks")
    .update(sanitizeUpdate(input))
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("*")
    .single();

  throwIfError(error, "updateProjectTask");
  return data as OperatingProjectTask;
}

export async function createProjectDecision(projectKey: string, input: {
  decision: string;
  reason?: string;
  status?: string;
  source_decision_gate_id?: string;
}, namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const project = await requireProjectByKey(projectKey, namespace);
  const client = await db();
  const { data, error } = await client
    .from("operating_project_decisions")
    .insert({
      user_id: userId,
      namespace,
      project_id: project.id,
      decision: input.decision,
      reason: input.reason ?? null,
      status: input.status ?? "active",
      source_decision_gate_id: input.source_decision_gate_id ?? null,
    })
    .select("*")
    .single();

  throwIfError(error, "createProjectDecision");
  return data as OperatingProjectDecision;
}

export async function createProjectConstraint(projectKey: string, input: {
  constraint_text: string;
  severity?: string;
  status?: string;
}, namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const project = await requireProjectByKey(projectKey, namespace);
  const client = await db();
  const { data, error } = await client
    .from("operating_project_constraints")
    .insert({
      user_id: userId,
      namespace,
      project_id: project.id,
      constraint_text: input.constraint_text,
      severity: input.severity ?? "normal",
      status: input.status ?? "active",
    })
    .select("*")
    .single();

  throwIfError(error, "createProjectConstraint");
  return data as OperatingProjectConstraint;
}

export async function createProjectArtifact(projectKey: string, input: {
  title: string;
  artifact_type?: string;
  uri?: string;
  description?: string;
  proof_value?: string;
}, namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const project = await requireProjectByKey(projectKey, namespace);
  const client = await db();
  const { data, error } = await client
    .from("operating_project_artifacts")
    .insert({
      user_id: userId,
      namespace,
      project_id: project.id,
      title: input.title,
      artifact_type: input.artifact_type ?? "note",
      uri: input.uri ?? null,
      description: input.description ?? null,
      proof_value: input.proof_value ?? null,
    })
    .select("*")
    .single();

  throwIfError(error, "createProjectArtifact");
  return data as OperatingProjectArtifact;
}

export async function createProjectOpenLoop(projectKey: string, input: {
  loop_text: string;
  status?: string;
  next_action?: string;
}, namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const project = await requireProjectByKey(projectKey, namespace);
  const client = await db();
  const { data, error } = await client
    .from("operating_project_open_loops")
    .insert({
      user_id: userId,
      namespace,
      project_id: project.id,
      loop_text: input.loop_text,
      status: input.status ?? "open",
      next_action: input.next_action ?? null,
    })
    .select("*")
    .single();

  throwIfError(error, "createProjectOpenLoop");
  return data as OperatingProjectOpenLoop;
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
    tasks: (tasks.data ?? []) as OperatingProjectTask[],
    decisions: (decisions.data ?? []) as OperatingProjectDecision[],
    constraints: (constraints.data ?? []) as OperatingProjectConstraint[],
    artifacts: (artifacts.data ?? []) as OperatingProjectArtifact[],
    openLoops: (openLoops.data ?? []) as OperatingProjectOpenLoop[],
  };
}
