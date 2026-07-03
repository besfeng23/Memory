/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PandoraDashboardData } from "@/components/pandora/types";

export type PandoraDashboardDbClient = { from: (table: string) => any };
type Namespace = "real_life" | "au";
type Row = Record<string, any>;
type NamespaceRead = { namespace: Namespace; events: Row[]; packs: Row[]; profiles: Row[]; loops: Row[]; candidates: Row[]; review: Row[]; pruning: Row[] };
const namespaces: Namespace[] = ["real_life", "au"];

async function rows(client: PandoraDashboardDbClient, table: string, userId: string, namespace: Namespace, warnings: string[], limit = 100): Promise<Row[]> {
  try {
    const result = await client.from(table).select("*").eq("user_id", userId).eq("namespace", namespace).order("created_at", { ascending: false }).limit(limit);
    if (result.error) { warnings.push(`${table}/${namespace} read unavailable; showing empty state.`); return []; }
    return Array.isArray(result.data) ? result.data : [];
  } catch {
    warnings.push(`${table}/${namespace} read unavailable; showing empty state.`);
    return [];
  }
}

function countStatus(list: Row[], values: string[]) { return list.filter((row) => values.includes(String(row.status ?? ""))).length; }
function activeMasters(item: NamespaceRead) { return item.packs.filter((pack) => pack.pack_type === "master" && pack.status === "active"); }
function safeArrayLength(value: unknown) { return Array.isArray(value) ? value.length : 0; }
function formatConfidence(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return { percent: 0, label: "N/A" };
  const normalized = n <= 1 ? n * 100 : n;
  const percent = Math.round(Math.max(0, Math.min(100, normalized)));
  return { percent, label: `${percent}%` };
}
function eventSummary(event: Row) {
  const summary = typeof event.extracted_summary === "string" && event.extracted_summary.trim() ? event.extracted_summary.trim() : null;
  const raw = typeof event.raw_text === "string" && event.raw_text.trim() ? event.raw_text.trim() : null;
  return summary ?? raw ?? "No summary returned for this live row.";
}

export async function loadPandoraDashboardData(client: PandoraDashboardDbClient, input: { userId: string; operatorLabel?: string }): Promise<PandoraDashboardData> {
  const warnings: string[] = [];
  const data = await Promise.all(namespaces.map(async (namespace) => ({
    namespace,
    events: await rows(client, "memory_events", input.userId, namespace, warnings, 500),
    packs: await rows(client, "memory_context_packs", input.userId, namespace, warnings, 50),
    profiles: await rows(client, "memory_profiles", input.userId, namespace, warnings, 20),
    loops: await rows(client, "memory_open_loops", input.userId, namespace, warnings, 100),
    candidates: await rows(client, "memory_capture_candidates", input.userId, namespace, warnings, 100),
    review: await rows(client, "memory_review_queue_items", input.userId, namespace, warnings, 100),
    pruning: await rows(client, "memory_pruning_candidates", input.userId, namespace, warnings, 100),
  })));

  const events = data.flatMap((item) => item.events);
  const mastersByNamespace = data.map((item) => ({ namespace: item.namespace, masters: activeMasters(item) }));
  const activeMasterCount = mastersByNamespace.reduce((sum, item) => sum + item.masters.length, 0);
  const duplicates = mastersByNamespace.reduce((sum, item) => sum + Math.max(0, item.masters.length - 1), 0);
  const openLoops = data.reduce((sum, item) => sum + countStatus(item.loops, ["open", "acknowledged"]), 0);
  const needsReview = data.reduce((sum, item) => sum + item.candidates.filter((row) => row.status === "pending" || row.requires_review === true).length + countStatus(item.review, ["pending_review", "needs_clarification"]), 0);
  const pruningReview = data.reduce((sum, item) => sum + countStatus(item.pruning, ["open", "needs_review"]), 0);
  const profile = data.flatMap((item) => item.profiles).find((row) => row.status === "active" || row.status == null);
  const confidence = formatConfidence(profile?.confidence);

  return {
    generatedAt: new Date().toISOString(),
    operatorLabel: input.operatorLabel ?? input.userId,
    live: warnings.length === 0,
    warnings,
    hero: { title: "Pandora dashboard is reading live memory state.", description: "This route renders authenticated Supabase data for memory state while semantic retrieval, embeddings, model calls, GPT Actions, and MCP remain gated.", primaryAction: "Context pack data live", secondaryAction: "Retrieval eval Gated" },
    evidence: warnings.length ? "Live dashboard read completed with safe empty states for unavailable tables." : "Live dashboard read complete from server-derived session scope.",
    stats: [
      { id: "events", title: "Memory Events", value: String(events.length), subtitle: "Authenticated rows", color: "indigo", sparklineData: data.map((item) => item.events.length) },
      { id: "packs", title: "Active Master Packs", value: String(activeMasterCount), subtitle: duplicates ? `${duplicates} duplicate active master pack(s)` : "Invariant OK", color: duplicates ? "amber" : "emerald", sparklineData: mastersByNamespace.map((item) => item.masters.length) },
      { id: "reviewed", title: "Reviewed/Promoted", value: String(countStatus(events, ["reviewed", "promoted"])), subtitle: "memory_events status", color: "blue", sparklineData: [0, countStatus(events, ["reviewed", "promoted"])] },
      { id: "loops", title: "Open Loops", value: String(openLoops), subtitle: "memory_open_loops", color: openLoops ? "amber" : "slate", sparklineData: [0, openLoops] },
      { id: "retrieval", title: "Retrieval Eval", value: "Gated", subtitle: "Semantic gated; no accuracy claim", color: "amber", sparklineData: [0, 0, 0] },
      { id: "queue", title: "Review Queue", value: String(needsReview + pruningReview), subtitle: "pending review rows", color: needsReview || pruningReview ? "amber" : "slate", sparklineData: [0, needsReview + pruningReview] },
    ],
    memorySpaces: data.map((item) => {
      const masters = activeMasters(item);
      const master = masters[0];
      const description = master ? `Active master context pack: ${String(master.title ?? master.id ?? "untitled")}` : "No active master context pack returned for this namespace.";
      return { id: item.namespace, label: item.namespace, type: item.namespace === "real_life" ? "Primary Space" : "Isolated AU Space", description, memories: item.events.length, people: safeArrayLength(master?.people_map), projects: safeArrayLength(master?.active_projects), status: masters.length === 1 ? "Active" : "Degraded", color: item.namespace === "real_life" ? "emerald" : "purple" };
    }),
    workQueue: { needsReview, openLoops, stalePacks: pruningReview, failedTests: 0, profileRefreshDue: profile ? 0 : 1, packSupersessionNeeded: duplicates, peopleMapDesignNeeded: 0 },
    profileSnapshot: { name: profile?.title ?? "No active profile", status: profile ? "Live read" : "No live data", confidencePercent: confidence.percent, confidenceLabel: confidence.label, summary: profile?.summary ?? "No active adaptive profile returned for this session.", lastRefreshed: profile?.updated_at ?? "No profile timestamp returned", traits: ["Authenticated", "RLS scoped"], evidence: profile?.id ? `Live profile row ${profile.id}` : "No active profile row" },
    timelineEvents: events.slice(0, 6).map((event) => ({ id: String(event.id ?? `${event.namespace}-${event.created_at ?? "event"}`), title: `${event.namespace} • ${event.status ?? "unknown"}`, time: event.created_at ?? "Live read", desc: eventSummary(event), namespace: event.namespace === "au" ? "au" : "real_life", color: event.namespace === "au" ? "purple" : "emerald" })),
    diagnostics: { coreSystems: [{ label: "Route exposure", value: "Auth gated", state: "healthy" }, { label: "Displayed data", value: warnings.length ? "Partial live reads" : "Live reads", state: warnings.length ? "attention" : "healthy" }, { label: "Master-pack invariant", value: duplicates ? `${duplicates} duplicate` : "OK", state: duplicates ? "attention" : "healthy" }, { label: "Client user_id", value: "Rejected", state: "healthy" }], gatedSystems: [{ label: "Semantic retrieval", value: "Gated Off", state: "gated" }, { label: "Embeddings", value: "Gated Off", state: "gated" }, { label: "Model calls", value: "Gated Off", state: "gated" }, { label: "Pruning automation", value: "Review-only", state: "gated" }], envelope: { title: "Dashboard Truth Envelope", description: warnings.length ? "Unavailable reads were converted to warnings and empty UI state." : "Live loader completed from authenticated Supabase reads." } },
  };
}
