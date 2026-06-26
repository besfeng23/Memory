import type { PandoraRuntimeSafetyConfigResult } from "@/lib/config/pandora-runtime-safety-config";
import type { MemoryBridgePrincipal } from "@/lib/services/memory-bridge-auth";

export type MemoryBridgeNamespace = "real_life" | "au";
export type MemoryEventStatus = "captured" | "reviewed" | "promoted" | "ignored" | "archived";
export type MemoryContextPackType = "daily" | "weekly" | "master" | "project" | "people" | "risk" | "operating_rules";
export type MemoryEvent = {
  id: string;
  namespace: MemoryBridgeNamespace;
  user_id: string;
  source: string;
  source_ref?: string | null;
  raw_text: string;
  extracted_summary?: string | null;
  importance?: number | null;
  sensitivity?: "low" | "medium" | "high" | "private" | null;
  status: MemoryEventStatus;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};
export type MemoryContextPack = {
  id: string;
  namespace: MemoryBridgeNamespace;
  user_id: string;
  pack_type: MemoryContextPackType;
  title: string;
  summary: string;
  key_points: unknown[];
  active_projects?: unknown[] | null;
  people_map?: unknown[] | null;
  decisions?: unknown[] | null;
  risks?: unknown[] | null;
  open_loops?: unknown[] | null;
  generated_from_event_ids: string[];
  status: "active" | "superseded" | "archived";
  created_at?: string;
  updated_at?: string;
};

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null; count?: number | null }>;
type Query<T> = {
  select: (columns?: string, options?: unknown) => Query<T>;
  insert: (value: unknown) => Query<T>;
  update: (value: unknown) => Query<T>;
  eq: (column: string, value: unknown) => Query<T>;
  neq: (column: string, value: unknown) => Query<T>;
  order: (column: string, options?: unknown) => Query<T>;
  limit: (count: number) => Query<T>;
  single: () => QueryResult<T>;
  range: (from: number, to: number) => QueryResult<T[]>;
  then?: never;
};
export type MemoryBridgeDbClient = { from: <T = Record<string, unknown>>(table: string) => Query<T> };
export type BridgeResult<T> = { ok: true; data: T; blockers: string[]; warnings: string[] } | { ok: false; blockers: string[]; warnings: string[]; next_step: string };

const validNamespaces = ["real_life", "au"];
const validStatuses: MemoryEventStatus[] = ["captured", "reviewed", "promoted", "ignored", "archived"];

function namespaceOrDefault(namespace?: string): MemoryBridgeNamespace | null {
  if (!namespace) return "real_life";
  return validNamespaces.includes(namespace) ? (namespace as MemoryBridgeNamespace) : null;
}

function gate(runtime: PandoraRuntimeSafetyConfigResult, key: "memoryCaptureApiEnabled" | "memoryContextApiEnabled" | "memoryDistillationEnabled") {
  return runtime.config[key];
}

function preflight(
  principal: MemoryBridgePrincipal,
  runtime: PandoraRuntimeSafetyConfigResult,
  gateKey: "memoryCaptureApiEnabled" | "memoryContextApiEnabled" | "memoryDistillationEnabled",
  namespace?: string,
): BridgeResult<{ userId: string; createdBy: string; namespace: MemoryBridgeNamespace }> {
  if (!gate(runtime, gateKey)) return { ok: false, blockers: [`${gateKey}_disabled`], warnings: [], next_step: `Set ${runtime.gates[gateKey].envVar}=true in a reviewed environment.` };
  if (!principal.ok) return { ok: false, blockers: principal.blockers, warnings: [], next_step: "Authenticate as an operator or use the configured bridge bearer token." };
  const resolvedNamespace = namespaceOrDefault(namespace);
  if (!resolvedNamespace) return { ok: false, blockers: ["namespace_required"], warnings: [], next_step: "Use namespace real_life or au." };
  return { ok: true, data: { userId: principal.userId, createdBy: principal.createdBy, namespace: resolvedNamespace }, blockers: [], warnings: [] };
}

async function audit(client: MemoryBridgeDbClient, input: { userId: string; namespace: MemoryBridgeNamespace; action: string; table: string; recordId?: string; metadata?: Record<string, unknown> }) {
  return client.from("audit_logs").insert({
    user_id: input.userId,
    namespace: input.namespace,
    action: input.action,
    table_name: input.table,
    record_id: input.recordId,
    after_snapshot: input.metadata ?? {},
    metadata: { ...(input.metadata ?? {}), phase: "4A_daily_bridge", appendOnly: true },
  }).select("*").single();
}

export async function captureMemoryEvent(client: MemoryBridgeDbClient, input: { namespace?: string; source?: string; source_ref?: string; raw_text?: string; extracted_summary?: string; importance?: number; sensitivity?: string }, principal: MemoryBridgePrincipal, runtime: PandoraRuntimeSafetyConfigResult): Promise<BridgeResult<MemoryEvent>> {
  const pf = preflight(principal, runtime, "memoryCaptureApiEnabled", input.namespace);
  if (!pf.ok) return pf;
  if (!input.raw_text?.trim()) return { ok: false, blockers: ["empty_raw_text"], warnings: [], next_step: "Send non-empty raw_text." };
  const row = {
    namespace: pf.data.namespace,
    user_id: pf.data.userId,
    source: input.source?.trim() || "operator_note",
    source_ref: input.source_ref,
    raw_text: input.raw_text.trim(),
    extracted_summary: input.extracted_summary,
    importance: input.importance,
    sensitivity: input.sensitivity,
    status: "captured",
    created_by: pf.data.createdBy,
  };
  const result = await client.from<MemoryEvent>("memory_events").insert(row).select("*").single();
  if (result.error || !result.data) return { ok: false, blockers: ["capture_write_failed"], warnings: [result.error?.message ?? "unknown write failure"], next_step: "Check memory_events schema and RLS." };
  await audit(client, { userId: pf.data.userId, namespace: pf.data.namespace, action: "memory_event_captured", table: "memory_events", recordId: result.data.id, metadata: { eventId: result.data.id, source: result.data.source } });
  return { ok: true, data: result.data, blockers: [], warnings: [] };
}

export async function listMemoryEvents(client: MemoryBridgeDbClient, input: { namespace?: string; status?: string; limit?: number }, principal: MemoryBridgePrincipal, runtime: PandoraRuntimeSafetyConfigResult): Promise<BridgeResult<MemoryEvent[]>> {
  const pf = preflight(principal, runtime, "memoryCaptureApiEnabled", input.namespace);
  if (!pf.ok) return pf;
  let query = client.from<MemoryEvent>("memory_events").select("*").eq("user_id", pf.data.userId).eq("namespace", pf.data.namespace).order("created_at", { ascending: false }).limit(Math.min(Math.max(input.limit ?? 25, 1), 100));
  if (input.status && validStatuses.includes(input.status as MemoryEventStatus)) query = query.eq("status", input.status);
  const result = await (query as unknown as Promise<{ data: MemoryEvent[] | null; error: { message: string } | null }>);
  if (result.error) return { ok: false, blockers: ["event_read_failed"], warnings: [result.error.message], next_step: "Check memory_events RLS." };
  return { ok: true, data: result.data ?? [], blockers: [], warnings: [] };
}

export async function updateMemoryEventStatus(client: MemoryBridgeDbClient, id: string, status: MemoryEventStatus, input: { namespace?: string }, principal: MemoryBridgePrincipal, runtime: PandoraRuntimeSafetyConfigResult): Promise<BridgeResult<MemoryEvent>> {
  const pf = preflight(principal, runtime, "memoryCaptureApiEnabled", input.namespace);
  if (!pf.ok) return pf;
  const result = await client.from<MemoryEvent>("memory_events").update({ status, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", pf.data.userId).eq("namespace", pf.data.namespace).select("*").single();
  if (result.error || !result.data) return { ok: false, blockers: ["event_status_update_failed"], warnings: [result.error?.message ?? "unknown update failure"], next_step: "Check event id, namespace, and RLS." };
  await audit(client, { userId: pf.data.userId, namespace: pf.data.namespace, action: `memory_event_${status}`, table: "memory_events", recordId: result.data.id, metadata: { eventId: result.data.id, status } });
  return { ok: true, data: result.data, blockers: [], warnings: [] };
}

export async function listContextPacks(client: MemoryBridgeDbClient, input: { namespace?: string; pack_type?: string; limit?: number }, principal: MemoryBridgePrincipal, runtime: PandoraRuntimeSafetyConfigResult): Promise<BridgeResult<MemoryContextPack[]>> {
  const pf = preflight(principal, runtime, "memoryContextApiEnabled", input.namespace);
  if (!pf.ok) return pf;
  let query = client.from<MemoryContextPack>("memory_context_packs").select("*").eq("user_id", pf.data.userId).eq("namespace", pf.data.namespace).eq("status", "active").order("created_at", { ascending: false }).limit(Math.min(Math.max(input.limit ?? 5, 1), 25));
  if (input.pack_type) query = query.eq("pack_type", input.pack_type);
  const result = await (query as unknown as Promise<{ data: MemoryContextPack[] | null; error: { message: string } | null }>);
  if (result.error) return { ok: false, blockers: ["context_pack_read_failed"], warnings: [result.error.message], next_step: "Check context pack RLS." };
  return { ok: true, data: result.data ?? [], blockers: [], warnings: [] };
}

export async function createContextPack(client: MemoryBridgeDbClient, pack: Omit<MemoryContextPack, "id" | "created_at" | "updated_at" | "status"> & { status?: "active" | "superseded" | "archived" }, principal: MemoryBridgePrincipal, runtime: PandoraRuntimeSafetyConfigResult): Promise<BridgeResult<MemoryContextPack>> {
  const pf = preflight(principal, runtime, "memoryDistillationEnabled", pack.namespace);
  if (!pf.ok) return pf;
  const result = await client.from<MemoryContextPack>("memory_context_packs").insert({ ...pack, user_id: pf.data.userId, namespace: pf.data.namespace, status: pack.status ?? "active" }).select("*").single();
  if (result.error || !result.data) return { ok: false, blockers: ["context_pack_write_failed"], warnings: [result.error?.message ?? "unknown context pack write failure"], next_step: "Check memory_context_packs schema and RLS." };
  await audit(client, { userId: pf.data.userId, namespace: pf.data.namespace, action: "memory_context_pack_distilled", table: "memory_context_packs", recordId: result.data.id, metadata: { packId: result.data.id, packType: result.data.pack_type } });
  return { ok: true, data: result.data, blockers: [], warnings: [] };
}
