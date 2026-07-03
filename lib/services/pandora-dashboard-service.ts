import type { PandoraDashboardData, DashboardStatData, MemorySpace, SystemRow, TimelineEventData, WorkQueueData, ProfileSnapshot } from "@/components/pandora/types";

export type PandoraDashboardNamespace = "real_life" | "au";

type QueryResult<T> = Promise<{ data: T[] | null; error: { message: string } | null }>;
type PandoraQuery<T> = {
  select: (columns?: string, options?: unknown) => PandoraQuery<T>;
  eq: (column: string, value: unknown) => PandoraQuery<T>;
  order: (column: string, options?: unknown) => PandoraQuery<T>;
  limit: (count: number) => PandoraQuery<T>;
  then?: QueryResult<T>["then"];
};
export type PandoraDashboardDbClient = { from: <T = Record<string, unknown>>(table: string) => PandoraQuery<T> };

type MemoryEventRow = {
  id: string;
  user_id: string;
  namespace: PandoraDashboardNamespace;
  source?: string | null;
  raw_text?: string | null;
  extracted_summary?: string | null;
  importance?: number | null;
  sensitivity?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type ContextPackRow = {
  id: string;
  user_id: string;
  namespace: PandoraDashboardNamespace;
  pack_type: string;
  title?: string | null;
  summary?: string | null;
  key_points?: unknown[] | null;
  active_projects?: unknown[] | null;
  people_map?: unknown[] | null;
  decisions?: unknown[] | null;
  risks?: unknown[] | null;
  open_loops?: unknown[] | null;
  generated_from_event_ids?: unknown[] | null;
  status: "active" | "superseded" | "archived";
  created_at?: string | null;
  updated_at?: string | null;
};

type MemoryProfileRow = {
  id: string;
  user_id: string;
  namespace: PandoraDashboardNamespace;
  profile_type?: string | null;
  subject_key?: string | null;
  title?: string | null;
  summary?: string | null;
  preferences?: unknown[] | null;
  patterns?: unknown[] | null;
  confidence?: number | string | null;
  status?: string | null;
  updated_at?: string | null;
};

type OpenLoopRow = { id: string; user_id: string; namespace: PandoraDashboardNamespace; status?: string | null };
type CaptureCandidateRow = { id: string; user_id: string; namespace: PandoraDashboardNamespace; status?: string | null; requires_review?: boolean | null };
type ReviewQueueRow = { id: string; user_id: string; namespace: PandoraDashboardNamespace; status?: string | null };
type PruningCandidateRow = { id: string; user_id: string; namespace: PandoraDashboardNamespace; status?: string | null };

type NamespaceTruth = {
  namespace: PandoraDashboardNamespace;
  events: MemoryEventRow[];
  packs: ContextPackRow[];
  profiles: MemoryProfileRow[];
  openLoops: OpenLoopRow[];
  captureCandidates: CaptureCandidateRow[];
  reviewQueue: ReviewQueueRow[];
  pruningCandidates: PruningCandidateRow[];
};

const NAMESPACES: PandoraDashboardNamespace[] = ["real_life", "au"];

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function truncate(value: string, max = 180) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function formatDate(value?: string | null) {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid timestamp";
  return date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

async function readRows<T extends Record<string, unknown>>(
  client: PandoraDashboardDbClient,
  table: string,
  userId: string,
  namespace: PandoraDashboardNamespace | null,
  warnings: string[],
  options: { limit?: number; orderBy?: string } = {},
): Promise<T[]> {
  let query = client.from<T>(table).select("*").eq("user_id", userId);
  if (namespace) query = query.eq("namespace", namespace);
  if (options.orderBy) query = query.order(options.orderBy, { ascending: false });
  if (options.limit) query = query.limit(options.limit);
  const result = await (query as unknown as QueryResult<T>);
  if (result.error) {
    warnings.push(`${table}_read_failed: ${result.error.message}`);
    return [];
  }
  return result.data ?? [];
}

function countStatus(rows: Array<{ status?: string | null }>, statuses: string[]) {
  return rows.filter((row) => row.status && statuses.includes(row.status)).length;
}

function buildSpace(ns: NamespaceTruth): MemorySpace {
  const activeMasterPacks = ns.packs.filter((pack) => pack.pack_type === "master" && pack.status === "active");
  const newestMaster = activeMasterPacks[0] ?? ns.packs.find((pack) => pack.pack_type === "master");
  const peopleCount = asArray(newestMaster?.people_map).length;
  const projectCount = asArray(newestMaster?.active_projects).length;
  const status: MemorySpace["status"] = activeMasterPacks.length === 1 ? "Active" : "Degraded";
  const type = ns.namespace === "real_life" ? "Primary Space" : "Isolated Space";
  const description = newestMaster
    ? `${text(newestMaster.title, "Context pack")} • ${newestMaster.status} • ${formatDate(newestMaster.updated_at ?? newestMaster.created_at)}`
    : "No active master context pack returned by the authenticated read.";
  return {
    id: ns.namespace,
    label: ns.namespace,
    type,
    description,
    memories: ns.events.length,
    people: peopleCount,
    projects: projectCount,
    status,
    color: ns.namespace === "real_life" ? "emerald" : "purple",
  };
}

function buildProfile(namespaces: NamespaceTruth[]): ProfileSnapshot {
  const profiles = namespaces.flatMap((ns) => ns.profiles).filter((profile) => profile.status === "active" || !profile.status);
  const profile = profiles.find((row) => row.profile_type === "operating_profile" && row.subject_key === "global") ?? profiles[0];
  if (!profile) {
    return {
      name: "No active profile",
      status: "Live read",
      confidencePercent: 0,
      confidenceLabel: "N/A",
      summary: "No active adaptive profile returned for this session.",
      lastRefreshed: "No profile timestamp returned",
      traits: ["Authenticated", "RLS scoped", "No profile row"],
      evidence: "Live dashboard read complete • profile table returned no active operating profile",
    };
  }
  const confidence = Number(profile.confidence ?? 0);
  const percent = Number.isFinite(confidence) ? Math.round(Math.max(0, Math.min(1, confidence)) * 100) : 0;
  const preferences = asArray(profile.preferences).slice(0, 3).map((item, index) => {
    if (item && typeof item === "object" && "text" in item) return truncate(String((item as { text?: unknown }).text ?? `Preference ${index + 1}`), 36);
    return truncate(String(item), 36);
  });
  const patterns = asArray(profile.patterns).slice(0, 2).map((item, index) => {
    if (item && typeof item === "object" && "text" in item) return truncate(String((item as { text?: unknown }).text ?? `Pattern ${index + 1}`), 36);
    return truncate(String(item), 36);
  });
  return {
    name: text(profile.title, text(profile.profile_type, "Adaptive Profile")),
    status: "Live read",
    confidencePercent: percent,
    confidenceLabel: percent ? `${percent}%` : "N/A",
    summary: text(profile.summary, "Active profile returned without a summary."),
    lastRefreshed: `Updated ${formatDate(profile.updated_at)}`,
    traits: [...preferences, ...patterns].length ? [...preferences, ...patterns] : [profile.namespace, text(profile.subject_key, "global")],
    evidence: `Live profile row ${profile.id} • ${profile.namespace} • request scoped to authenticated user`,
  };
}

function buildTimeline(namespaces: NamespaceTruth[]): TimelineEventData[] {
  const events = namespaces
    .flatMap((ns) => ns.events.map((event) => ({ ...event, namespace: ns.namespace })))
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, 6);

  if (!events.length) {
    return [{ id: "no-events", title: "No recent memory events", time: "Live read", desc: "The authenticated read returned no memory events for this user.", namespace: "real_life", color: "slate" }];
  }

  return events.map((event) => ({
    id: event.id,
    title: `${event.namespace} • ${event.status}`,
    time: formatDate(event.created_at),
    desc: truncate(text(event.extracted_summary, text(event.raw_text, "No summary available"))),
    namespace: event.namespace,
    color: event.namespace === "real_life" ? "emerald" : "purple",
  }));
}

function buildStats(namespaces: NamespaceTruth[], duplicateMasterCount: number, openLoopCount: number, reviewCount: number): DashboardStatData[] {
  const events = namespaces.flatMap((ns) => ns.events);
  const activeMasters = namespaces.flatMap((ns) => ns.packs).filter((pack) => pack.pack_type === "master" && pack.status === "active");
  const promoted = countStatus(events, ["promoted", "reviewed"]);
  return [
    { id: "events", title: "Memory Events", value: String(events.length), subtitle: "Authenticated RLS-scoped rows", color: "indigo", sparklineData: NAMESPACES.map((namespace) => namespaces.find((ns) => ns.namespace === namespace)?.events.length ?? 0) },
    { id: "packs", title: "Active Master Packs", value: String(activeMasters.length), subtitle: duplicateMasterCount ? `${duplicateMasterCount} duplicate active pack(s)` : "One-per-namespace invariant OK", color: duplicateMasterCount ? "amber" : "emerald", sparklineData: NAMESPACES.map((namespace) => namespaces.find((ns) => ns.namespace === namespace)?.packs.filter((pack) => pack.pack_type === "master" && pack.status === "active").length ?? 0) },
    { id: "reviewed", title: "Reviewed/Promoted", value: String(promoted), subtitle: "From memory_events status", color: "blue", sparklineData: [0, promoted] },
    { id: "loops", title: "Open Loops", value: String(openLoopCount), subtitle: "From memory_open_loops", color: openLoopCount ? "amber" : "slate", sparklineData: [0, openLoopCount] },
    { id: "retrieval", title: "Retrieval Eval", value: "Gated", subtitle: "No accuracy claim without eval route", color: "amber", sparklineData: [0, 0, 0, 0, 0] },
    { id: "queue", title: "Review Queue", value: String(reviewCount), subtitle: "Pending review/candidate rows", color: reviewCount ? "amber" : "slate", sparklineData: [0, reviewCount] },
  ];
}

function buildDiagnostics(duplicateMasterCount: number, warnings: string[]): { coreSystems: SystemRow[]; gatedSystems: SystemRow[]; envelope: { title: string; description: string } } {
  return {
    coreSystems: [
      { label: "Route exposure", value: "Auth gated", state: "healthy" },
      { label: "Displayed data", value: "Live RLS reads", state: warnings.length ? "attention" : "healthy" },
      { label: "Master-pack invariant", value: duplicateMasterCount ? `${duplicateMasterCount} duplicate` : "OK", state: duplicateMasterCount ? "attention" : "healthy" },
      { label: "Client user_id", value: "Rejected", state: "healthy" },
    ],
    gatedSystems: [
      { label: "Semantic retrieval", value: "Gated Off", state: "gated" },
      { label: "Embeddings", value: "Gated Off", state: "gated" },
      { label: "Model calls", value: "Gated Off", state: "gated" },
      { label: "Pruning automation", value: "Review-only", state: "gated" },
    ],
    envelope: {
      title: "Dashboard Truth Envelope",
      description: warnings.length ? `Live loader completed with ${warnings.length} warning(s).` : "Live loader completed from authenticated Supabase reads; no service-role dashboard read and no mock counts.",
    },
  };
}

export async function loadPandoraDashboardData(client: PandoraDashboardDbClient, input: { userId: string; operatorLabel?: string }): Promise<PandoraDashboardData> {
  const warnings: string[] = [];
  const namespaces: NamespaceTruth[] = [];

  for (const namespace of NAMESPACES) {
    const [events, packs, profiles, openLoops, captureCandidates, reviewQueue, pruningCandidates] = await Promise.all([
      readRows<MemoryEventRow>(client, "memory_events", input.userId, namespace, warnings, { limit: 500, orderBy: "created_at" }),
      readRows<ContextPackRow>(client, "memory_context_packs", input.userId, namespace, warnings, { limit: 50, orderBy: "created_at" }),
      readRows<MemoryProfileRow>(client, "memory_profiles", input.userId, namespace, warnings, { limit: 20, orderBy: "updated_at" }),
      readRows<OpenLoopRow>(client, "memory_open_loops", input.userId, namespace, warnings, { limit: 100, orderBy: "created_at" }),
      readRows<CaptureCandidateRow>(client, "memory_capture_candidates", input.userId, namespace, warnings, { limit: 100, orderBy: "created_at" }),
      readRows<ReviewQueueRow>(client, "memory_review_queue_items", input.userId, namespace, warnings, { limit: 100, orderBy: "created_at" }),
      readRows<PruningCandidateRow>(client, "memory_pruning_candidates", input.userId, namespace, warnings, { limit: 100, orderBy: "created_at" }),
    ]);
    namespaces.push({ namespace, events, packs, profiles, openLoops, captureCandidates, reviewQueue, pruningCandidates });
  }

  const openLoopCount = namespaces.reduce((sum, ns) => sum + countStatus(ns.openLoops, ["open", "acknowledged"]), 0);
  const needsReview = namespaces.reduce((sum, ns) => sum
    + ns.captureCandidates.filter((row) => row.status === "pending" || row.requires_review === true).length
    + countStatus(ns.reviewQueue, ["pending_review", "needs_clarification"]), 0);
  const pruningReview = namespaces.reduce((sum, ns) => sum + countStatus(ns.pruningCandidates, ["open"]), 0);
  const duplicateMasterCount = namespaces.reduce((sum, ns) => {
    const activeMasters = ns.packs.filter((pack) => pack.pack_type === "master" && pack.status === "active").length;
    return sum + Math.max(0, activeMasters - 1);
  }, 0);

  const workQueue: WorkQueueData = {
    needsReview,
    openLoops: openLoopCount,
    stalePacks: pruningReview,
    failedTests: warnings.length,
    profileRefreshDue: namespaces.some((ns) => ns.profiles.length === 0) ? 1 : 0,
    packSupersessionNeeded: duplicateMasterCount,
    peopleMapDesignNeeded: 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    operatorLabel: input.operatorLabel ?? input.userId,
    live: true,
    warnings,
    hero: {
      title: "Pandora dashboard is reading live memory state.",
      description: "This route now renders authenticated, RLS-scoped Supabase data for context packs, events, profiles, open loops, and review queues. Gated intelligence features still stay explicit.",
      primaryAction: "Context pack data live",
      secondaryAction: "Retrieval eval still gated",
    },
    evidence: warnings.length ? `Live read completed with warnings • ${warnings.join(" • ")}` : "Live RLS-scoped dashboard read • no mock counts • no service-role dashboard read",
    stats: buildStats(namespaces, duplicateMasterCount, openLoopCount, needsReview + pruningReview),
    memorySpaces: namespaces.map(buildSpace),
    workQueue,
    profileSnapshot: buildProfile(namespaces),
    timelineEvents: buildTimeline(namespaces),
    diagnostics: buildDiagnostics(duplicateMasterCount, warnings),
  };
}
