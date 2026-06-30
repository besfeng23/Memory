import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentUserId } from "@/lib/security/auth";
import type { Json, PandoraNamespace } from "@/lib/supabase/database.types";
import type {
  DecisionGate,
  OneBestNextAction,
  OperatingSnapshot,
  PriorityGateResult,
  PriorityLock,
  RawMovementItem,
  SuggestedRawMovementConversion,
  WorkSession,
} from "@/lib/operating/types";

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

type OperatingDb = {
  from(table: string): QueryChain;
};

const IMMUTABLE_UPDATE_FIELDS = new Set(["id", "user_id", "namespace", "created_at", "updated_at"]);

function asOperatingDb(client: unknown): OperatingDb {
  return client as OperatingDb;
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

async function db() {
  return asOperatingDb(await createSupabaseServerClient());
}

export function suggestRawMovementConversion(rawText: string): SuggestedRawMovementConversion {
  const text = rawText.toLowerCase();

  if (["proof", "evidence", "verify"].some((term) => text.includes(term))) {
    return { type: "proof_needed", reason: "The note asks for proof, evidence, or verification." };
  }

  if (["risk", "danger", "blocked"].some((term) => text.includes(term))) {
    return { type: "risk", reason: "The note appears to describe a risk or blocker." };
  }

  if (["decide", "should we", "approve"].some((term) => text.includes(term))) {
    return { type: "decision_gate", reason: "The note appears to require a decision gate." };
  }

  if (["task", "build", "fix", "create"].some((term) => text.includes(term))) {
    return { type: "task", reason: "The note appears to be an implementation task." };
  }

  return { type: "note", reason: "The note should be reviewed before conversion." };
}

async function supersedeActiveWorkSessions(userId: string, namespace: PandoraNamespace) {
  const client = await db();
  const { error } = await client
    .from("work_sessions")
    .update({ status: "superseded", ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .eq("status", "active");

  throwIfError(error, "supersedeActiveWorkSessions");
}

async function supersedeActivePriorityLocks(userId: string, namespace: PandoraNamespace) {
  const client = await db();
  const { error } = await client
    .from("priority_locks")
    .update({ status: "superseded" })
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .eq("status", "active");

  throwIfError(error, "supersedeActivePriorityLocks");
}

async function supersedeActiveObnas(userId: string, namespace: PandoraNamespace) {
  const client = await db();
  const { error } = await client
    .from("one_best_next_actions")
    .update({ status: "superseded" })
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .eq("status", "active");

  throwIfError(error, "supersedeActiveObnas");
}

export async function createWorkSession(input: {
  namespace?: PandoraNamespace;
  project_key?: string;
  declared_goal: string;
  proof_target?: string;
  next_action?: string;
}) {
  const userId = await requireCurrentUserId();
  const namespace = normalizeNamespace(input.namespace);
  await supersedeActiveWorkSessions(userId, namespace);

  const client = await db();
  const { data, error } = await client
    .from("work_sessions")
    .insert({
      user_id: userId,
      namespace,
      project_key: input.project_key ?? null,
      declared_goal: input.declared_goal,
      proof_target: input.proof_target ?? null,
      next_action: input.next_action ?? null,
      status: "active",
    })
    .select("*")
    .single();

  throwIfError(error, "createWorkSession");
  return data as WorkSession;
}

export async function getActiveWorkSession(namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("work_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, "getActiveWorkSession");
  return data as WorkSession | null;
}

export async function listRecentWorkSessions(namespace: PandoraNamespace = "real_life", limit = 10) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("work_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .order("created_at", { ascending: false })
    .limit(limit);

  throwIfError(error, "listRecentWorkSessions");
  return (data ?? []) as WorkSession[];
}

export async function endWorkSession(id: string, input: { outcome_summary?: string; next_action?: string }) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("work_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      outcome_summary: input.outcome_summary ?? null,
      next_action: input.next_action ?? null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  throwIfError(error, "endWorkSession");
  return data as WorkSession;
}

export async function updateWorkSession(id: string, input: Record<string, unknown>) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("work_sessions")
    .update(sanitizeUpdate(input))
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  throwIfError(error, "updateWorkSession");
  return data as WorkSession;
}

export async function createPriorityLock(input: {
  namespace?: PandoraNamespace;
  project_key: string;
  locked_outcome: string;
  proof_target?: string;
  allowed_support?: string[];
  blocked_distractions?: string[];
  locked_until?: string;
  status?: string;
}) {
  const userId = await requireCurrentUserId();
  const namespace = normalizeNamespace(input.namespace);
  const status = input.status ?? "active";

  if (status === "active") {
    await supersedeActivePriorityLocks(userId, namespace);
  }

  const client = await db();
  const { data, error } = await client
    .from("priority_locks")
    .insert({
      user_id: userId,
      namespace,
      project_key: input.project_key,
      locked_outcome: input.locked_outcome,
      proof_target: input.proof_target ?? null,
      allowed_support: input.allowed_support ?? [],
      blocked_distractions: input.blocked_distractions ?? [],
      locked_until: input.locked_until ?? null,
      status,
    })
    .select("*")
    .single();

  throwIfError(error, "createPriorityLock");
  return data as PriorityLock;
}

export async function getActivePriorityLock(namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("priority_locks")
    .select("*")
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, "getActivePriorityLock");
  return data as PriorityLock | null;
}

export async function updatePriorityLock(id: string, input: Record<string, unknown>) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("priority_locks")
    .update(sanitizeUpdate(input))
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  throwIfError(error, "updatePriorityLock");
  return data as PriorityLock;
}

export async function createRawMovementItem(input: {
  namespace?: PandoraNamespace;
  raw_text: string;
  source?: string;
}) {
  const userId = await requireCurrentUserId();
  const conversion = suggestRawMovementConversion(input.raw_text);
  const client = await db();
  const { data, error } = await client
    .from("raw_movement_items")
    .insert({
      user_id: userId,
      namespace: normalizeNamespace(input.namespace),
      raw_text: input.raw_text,
      source: input.source ?? "manual",
      suggested_conversion: conversion as unknown as Json,
      risk_level: conversion.type === "risk" ? "elevated" : "normal",
      status: "new",
    })
    .select("*")
    .single();

  throwIfError(error, "createRawMovementItem");
  return data as RawMovementItem;
}

export async function listRawMovementItems(namespace: PandoraNamespace = "real_life", limit = 10) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("raw_movement_items")
    .select("*")
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .order("created_at", { ascending: false })
    .limit(limit);

  throwIfError(error, "listRawMovementItems");
  return (data ?? []) as RawMovementItem[];
}

export async function updateRawMovementItemStatus(id: string, input: { status?: string; risk_level?: string }) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("raw_movement_items")
    .update(sanitizeUpdate(input as Record<string, unknown>))
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  throwIfError(error, "updateRawMovementItemStatus");
  return data as RawMovementItem;
}

export async function createDecisionGate(input: {
  namespace?: PandoraNamespace;
  action_considered: string;
  desired_outcome?: string;
  facts?: string[];
  assumptions?: string[];
  risks?: string[];
  authority_check?: string;
  proof_required?: string;
  recommendation?: string;
  next_action?: string;
  status?: string;
}) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("decision_gates")
    .insert({
      user_id: userId,
      namespace: normalizeNamespace(input.namespace),
      action_considered: input.action_considered,
      desired_outcome: input.desired_outcome ?? null,
      facts: input.facts ?? [],
      assumptions: input.assumptions ?? [],
      risks: input.risks ?? [],
      authority_check: input.authority_check ?? null,
      proof_required: input.proof_required ?? null,
      recommendation: input.recommendation ?? null,
      next_action: input.next_action ?? null,
      status: input.status ?? "draft",
    })
    .select("*")
    .single();

  throwIfError(error, "createDecisionGate");
  return data as DecisionGate;
}

export async function listDecisionGates(namespace: PandoraNamespace = "real_life", limit = 10) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("decision_gates")
    .select("*")
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .order("created_at", { ascending: false })
    .limit(limit);

  throwIfError(error, "listDecisionGates");
  return (data ?? []) as DecisionGate[];
}

export async function updateDecisionGate(id: string, input: Record<string, unknown>) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("decision_gates")
    .update(sanitizeUpdate(input))
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  throwIfError(error, "updateDecisionGate");
  return data as DecisionGate;
}

export async function createOneBestNextAction(input: {
  namespace?: PandoraNamespace;
  session_id?: string;
  priority_lock_id?: string;
  title: string;
  reason?: string;
  proof_target?: string;
  timebox_minutes?: number;
  steps?: string[];
  evidence_refs?: Json;
  status?: string;
}) {
  const userId = await requireCurrentUserId();
  const namespace = normalizeNamespace(input.namespace);
  const status = input.status ?? "active";

  if (status === "active") {
    await supersedeActiveObnas(userId, namespace);
  }

  const client = await db();
  const { data, error } = await client
    .from("one_best_next_actions")
    .insert({
      user_id: userId,
      namespace,
      session_id: input.session_id ?? null,
      priority_lock_id: input.priority_lock_id ?? null,
      title: input.title,
      reason: input.reason ?? null,
      proof_target: input.proof_target ?? null,
      timebox_minutes: input.timebox_minutes ?? 25,
      steps: input.steps ?? [],
      evidence_refs: input.evidence_refs ?? {},
      status,
    })
    .select("*")
    .single();

  throwIfError(error, "createOneBestNextAction");
  return data as OneBestNextAction;
}

export async function getActiveOneBestNextAction(namespace: PandoraNamespace = "real_life") {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("one_best_next_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, "getActiveOneBestNextAction");
  return data as OneBestNextAction | null;
}

export async function updateOneBestNextAction(id: string, input: Record<string, unknown>) {
  const userId = await requireCurrentUserId();
  const client = await db();
  const { data, error } = await client
    .from("one_best_next_actions")
    .update(sanitizeUpdate(input))
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  throwIfError(error, "updateOneBestNextAction");
  return data as OneBestNextAction;
}

export async function completeOneBestNextAction(id: string) {
  return updateOneBestNextAction(id, { status: "completed" });
}

export async function generateOneBestNextAction(namespace: PandoraNamespace = "real_life") {
  const [session, priorityLock, rawItems] = await Promise.all([
    getActiveWorkSession(namespace),
    getActivePriorityLock(namespace),
    listRawMovementItems(namespace, 1),
  ]);

  if (session?.next_action) {
    return createOneBestNextAction({
      namespace,
      session_id: session.id,
      title: session.next_action,
      reason: "Active work session already has an explicit next action.",
      proof_target: session.proof_target ?? undefined,
      timebox_minutes: 25,
      steps: ["Do the stated next action.", "Attach proof or update the session outcome.", "Do not start a new project until this is resolved."],
    });
  }

  if (session?.proof_target) {
    return createOneBestNextAction({
      namespace,
      session_id: session.id,
      title: `Produce proof for: ${session.proof_target}`,
      reason: "Active work session has a proof target but no explicit next action.",
      proof_target: session.proof_target,
      timebox_minutes: 30,
      steps: ["Identify the smallest proof artifact.", "Create or verify it.", "Update the work session outcome."],
    });
  }

  if (priorityLock?.proof_target) {
    return createOneBestNextAction({
      namespace,
      priority_lock_id: priorityLock.id,
      title: `Start a work session to produce proof for: ${priorityLock.proof_target}`,
      reason: "There is an active priority lock but no active work session.",
      proof_target: priorityLock.proof_target,
      timebox_minutes: 15,
      steps: ["Start a work session.", "Use the priority lock proof target.", "Define the first concrete next action."],
    });
  }

  if (rawItems.length > 0) {
    return createOneBestNextAction({
      namespace,
      title: "Review the Raw Movement Inbox and convert or park the top item.",
      reason: "There are unprocessed raw movement items and no active session or priority lock.",
      timebox_minutes: 15,
      steps: ["Open the Raw Movement Inbox.", "Convert, park, or reject the top item.", "Then start a work session."],
    });
  }

  return createOneBestNextAction({
    namespace,
    title: "Start a work session and define the proof target.",
    reason: "Pandora cannot detect drift without a declared work session.",
    timebox_minutes: 10,
    steps: ["Choose one project.", "Declare the goal.", "Define proof that would count as progress."],
  });
}

export function checkAgainstPriorityLock(proposedAction: string, priorityLock: PriorityLock | null): PriorityGateResult {
  if (!priorityLock) {
    return {
      result: "possible_drift",
      reason: "No active priority lock exists, so Pandora cannot confirm alignment.",
      recommended_next_action: "Create a priority lock or run a decision gate before expanding scope.",
    };
  }

  const action = proposedAction.toLowerCase();
  const project = priorityLock.project_key.toLowerCase();
  const outcome = priorityLock.locked_outcome.toLowerCase();
  const allowed = priorityLock.allowed_support ?? [];
  const blocked = priorityLock.blocked_distractions ?? [];

  const blockedHit = blocked.find((item) => action.includes(item.toLowerCase()));
  if (blockedHit) {
    return {
      result: "blocked",
      reason: `The proposed action matches a blocked distraction: ${blockedHit}.`,
      recommended_next_action: "Park it or run a decision gate. Do not switch away from the locked priority.",
    };
  }

  const allowedHit = allowed.find((item) => action.includes(item.toLowerCase()));
  if (allowedHit) {
    return {
      result: "support",
      reason: `The proposed action matches allowed support work: ${allowedHit}.`,
      recommended_next_action: "Proceed only if it directly supports the current proof target.",
    };
  }

  if (action.includes(project) || action.includes(outcome)) {
    return {
      result: "aligned",
      reason: "The proposed action references the active locked project or outcome.",
      recommended_next_action: "Proceed and attach proof to the active work session.",
    };
  }

  return {
    result: "possible_drift",
    reason: "The proposed action does not clearly support the active priority lock.",
    recommended_next_action: "Park it or run a decision gate before spending time on it.",
  };
}

export async function getOperatingSnapshot(namespace: PandoraNamespace = "real_life"): Promise<OperatingSnapshot> {
  const [activeWorkSession, activePriorityLock, activeObna, rawMovementItems, decisionGates] = await Promise.all([
    getActiveWorkSession(namespace),
    getActivePriorityLock(namespace),
    getActiveOneBestNextAction(namespace),
    listRawMovementItems(namespace, 5),
    listDecisionGates(namespace, 5),
  ]);

  return {
    activeWorkSession,
    activePriorityLock,
    activeObna,
    rawMovementItems,
    decisionGates,
  };
}
