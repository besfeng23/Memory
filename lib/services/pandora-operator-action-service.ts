/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash, randomUUID } from "node:crypto";
import type { PandoraNamespace } from "@/components/pandora/types";
import { loadPandoraDashboardData } from "@/lib/services/pandora-dashboard-service";
import { loadPandoraVerificationData } from "@/lib/services/pandora-verification-service";

export type OperatorActionType = "verify_namespace_invariants" | "verify_pack_supersession" | "check_retrieval_eval_status" | "refresh_dashboard_snapshot" | "prepare_distill_smoke_plan";
export type OperatorActionMode = "dry_run" | "queued_only";
export type OperatorActionStatus = "proposed" | "dry_ran" | "queued" | "blocked" | "completed" | "failed" | "cancelled";
export type OperatorActionRow = { id: string; user_id: string; request_id: string; idempotency_key: string; action_type: OperatorActionType; namespace: PandoraNamespace | null; mode: OperatorActionMode; status: OperatorActionStatus; title: string; description: string; payload: Record<string, unknown>; result: Record<string, unknown>; warnings: string[]; created_at: string; updated_at: string; approved_at?: string | null; completed_at?: string | null; failed_at?: string | null };
export type OperatorActionEventRow = { id: string; action_id: string; user_id: string; event_type: string; message: string; metadata: Record<string, unknown>; created_at: string };
export type OperatorActionDbClient = { from: (table: string) => any };

const ACTIONS = new Set<OperatorActionType>(["verify_namespace_invariants", "verify_pack_supersession", "check_retrieval_eval_status", "refresh_dashboard_snapshot", "prepare_distill_smoke_plan"]);
const MODES = new Set<OperatorActionMode>(["dry_run", "queued_only"]);
const NAMESPACES = new Set(["real_life", "au"]);

function assertAction(actionType: string): asserts actionType is OperatorActionType { if (!ACTIONS.has(actionType as OperatorActionType)) throw new Error(`Unsupported Pandora operator action_type: ${actionType}`); }
function assertMode(mode: string): asserts mode is OperatorActionMode { if (!MODES.has(mode as OperatorActionMode)) throw new Error(`Unsupported Pandora operator mode: ${mode}`); }
function assertNamespace(namespace?: string | null): asserts namespace is PandoraNamespace | null | undefined { if (namespace != null && !NAMESPACES.has(namespace)) throw new Error(`Unsupported Pandora namespace: ${namespace}`); }
function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(",")}}`; return JSON.stringify(value); }
export function operatorActionIdempotencyKey(input: { userId: string; actionType: string; namespace?: string | null; payload?: unknown; mode: string }) { return createHash("sha256").update([input.userId, input.actionType, input.namespace ?? "global", input.mode, stable(input.payload ?? {})].join("|")).digest("hex"); }
function titleFor(actionType: OperatorActionType) { return actionType.split("_").map((p) => p[0].toUpperCase() + p.slice(1)).join(" "); }
function envelope(action: OperatorActionRow, result: Record<string, unknown>, warnings: string[]) { return { ok: warnings.length === 0, request_id: action.request_id, action_id: action.id, status: action.status, warnings, evidence_summary: result, no_mutation_performed: true }; }
async function single(query: any) { const res = await query; if (res.error) return null; return Array.isArray(res.data) ? res.data[0] ?? null : res.data ?? null; }

export async function listOperatorActions(client: OperatorActionDbClient, input: { userId: string; limit?: number }): Promise<OperatorActionRow[]> {
  const result = await client.from("pandora_operator_actions").select("*").eq("user_id", input.userId).order("created_at", { ascending: false }).limit(input.limit ?? 20);
  if (result.error) return [];
  return Array.isArray(result.data) ? result.data : [];
}

export async function createActionEvent(client: OperatorActionDbClient, input: { userId: string; actionId: string; eventType: string; message: string; metadata?: Record<string, unknown> }): Promise<OperatorActionEventRow | null> {
  const row = { id: randomUUID(), action_id: input.actionId, user_id: input.userId, event_type: input.eventType, message: input.message, metadata: input.metadata ?? {}, created_at: new Date().toISOString() };
  return single(client.from("pandora_operator_action_events").insert(row).select("*").single());
}

export async function proposeOperatorAction(client: OperatorActionDbClient, input: { userId: string; actionType: string; namespace?: string | null; mode?: string; payload?: Record<string, unknown>; user_id?: never }): Promise<OperatorActionRow> {
  assertAction(input.actionType); const mode = input.mode ?? "dry_run"; assertMode(mode); assertNamespace(input.namespace);
  const idempotencyKey = operatorActionIdempotencyKey({ userId: input.userId, actionType: input.actionType, namespace: input.namespace, payload: input.payload, mode });
  const existing = await single(client.from("pandora_operator_actions").select("*").eq("user_id", input.userId).eq("idempotency_key", idempotencyKey).limit(1));
  if (existing) return existing;
  const now = new Date().toISOString(); const requestId = randomUUID();
  const row = { id: randomUUID(), user_id: input.userId, request_id: requestId, idempotency_key: idempotencyKey, action_type: input.actionType, namespace: input.namespace ?? null, mode, status: mode === "queued_only" ? "queued" : "proposed", title: titleFor(input.actionType), description: "Operator-proposed safe action. Initial implementation is dry-run or queued-only and cannot mutate core memory truth tables.", payload: input.payload ?? {}, result: {}, warnings: [], created_at: now, updated_at: now, approved_at: null, completed_at: null, failed_at: null };
  const created = await single(client.from("pandora_operator_actions").insert(row).select("*").single());
  if (!created) throw new Error("Unable to create Pandora operator action");
  await createActionEvent(client, { userId: input.userId, actionId: created.id, eventType: "proposed", message: "Operator action proposed with deterministic idempotency key.", metadata: { action_type: input.actionType, mode } });
  return created;
}

async function buildDryRunResult(client: OperatorActionDbClient, userId: string, action: OperatorActionRow) {
  const warnings: string[] = [];
  const verification = await loadPandoraVerificationData(client, { userId });
  if (action.action_type === "refresh_dashboard_snapshot") { const dashboard = await loadPandoraDashboardData(client, { userId }); warnings.push(...dashboard.warnings); return { warnings, result: { checked: "dashboard_snapshot", generated_at: dashboard.generatedAt, memory_spaces: dashboard.memorySpaces.map((s) => ({ namespace: s.id, memories: s.memories, status: s.status })), gated_systems: dashboard.diagnostics.gatedSystems, no_mutation_performed: true } }; }
  warnings.push(...verification.warnings);
  if (action.action_type === "prepare_distill_smoke_plan") return { warnings, result: { checked: "distill_smoke_plan", plan_only: true, steps: ["Verify authenticated operator session", "Select one namespace", "Run protected endpoint with dryRun:true", "Review output before any future approval"], forbidden: ["dryRun:false", "core memory table mutation", "profile rewrite", "pruning application"], no_mutation_performed: true } };
  if (action.action_type === "verify_pack_supersession") return { warnings, result: { checked: "pack_supersession", status: verification.packSupersession.status, namespaces: verification.packSupersession.namespaces, no_mutation_performed: true } };
  if (action.action_type === "check_retrieval_eval_status") return { warnings: [...warnings, ...verification.retrievalEval.warnings], result: { checked: "retrieval_eval_status", retrieval_eval: verification.retrievalEval, no_fake_accuracy: true, no_mutation_performed: true } };
  return { warnings, result: { checked: "namespace_invariants", invariant_status: verification.invariantStatus, namespaces: verification.namespaces, no_mutation_performed: true } };
}

export async function dryRunOperatorAction(client: OperatorActionDbClient, input: { userId: string; actionId: string }): Promise<OperatorActionRow> {
  const action = await single(client.from("pandora_operator_actions").select("*").eq("user_id", input.userId).eq("id", input.actionId).limit(1));
  if (!action) throw new Error("Pandora operator action not found for current user");
  const built = await buildDryRunResult(client, input.userId, action);
  const status: OperatorActionStatus = built.warnings.length ? "blocked" : "dry_ran";
  const nextResult = envelope({ ...action, status }, built.result, built.warnings);
  const updated = await single(client.from("pandora_operator_actions").update({ status, result: nextResult, warnings: built.warnings, updated_at: new Date().toISOString() }).eq("user_id", input.userId).eq("id", input.actionId).select("*").single());
  await createActionEvent(client, { userId: input.userId, actionId: input.actionId, eventType: status, message: "Safe dry-run completed; no core memory mutation was performed.", metadata: nextResult });
  return updated ?? { ...action, status, result: nextResult, warnings: built.warnings };
}

export async function cancelOperatorAction(client: OperatorActionDbClient, input: { userId: string; actionId: string }): Promise<OperatorActionRow> {
  const action = await single(client.from("pandora_operator_actions").select("*").eq("user_id", input.userId).eq("id", input.actionId).limit(1));
  if (!action) throw new Error("Pandora operator action not found for current user");
  const updated = await single(client.from("pandora_operator_actions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("user_id", input.userId).eq("id", input.actionId).select("*").single());
  await createActionEvent(client, { userId: input.userId, actionId: input.actionId, eventType: "cancelled", message: "Operator action cancelled before live execution; no mutation performed.", metadata: { no_mutation_performed: true } });
  return updated ?? { ...action, status: "cancelled" };
}
