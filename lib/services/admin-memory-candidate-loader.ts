import type { MemoryBridgeDbClient, MemoryBridgeNamespace } from "@/lib/services/memory-bridge-service";
import type { MemoryCaptureCandidate, MemoryCandidateStatus, MemorySensitivity } from "@/lib/services/memory-candidate-service";
import { summarizeMemoryScore, type MemoryScoreSummary } from "@/lib/services/memory-usefulness-scoring-service";

export type CandidateListFilters = { namespace?: MemoryBridgeNamespace; status?: MemoryCandidateStatus | "all"; sensitivity?: MemorySensitivity | "all"; sort?: "newest" | "importance" | "confidence" | "sensitivity"; limit?: number };
export type ScoredMemoryCaptureCandidate = MemoryCaptureCandidate & { score: MemoryScoreSummary };
const redact = (c: MemoryCaptureCandidate): MemoryCaptureCandidate => c.status === "blocked_secret" ? { ...c, raw_excerpt: "[REDACTED_SECRET]", redacted_excerpt: "[REDACTED_SECRET]", summary: c.summary || "[REDACTED_SECRET]" } : c;

// Phase 5D: attach deterministic usefulness/freshness labels for the review UI. Blocked
// secret candidates are never scored on raw content (their text is already redacted).
function attachScore(candidate: MemoryCaptureCandidate): ScoredMemoryCaptureCandidate {
  const score = summarizeMemoryScore({
    text: candidate.status === "blocked_secret" ? "" : (candidate.summary ?? candidate.redacted_excerpt ?? candidate.title ?? ""),
    namespace: candidate.namespace,
    memory_type: candidate.status === "blocked_secret" ? "secret_or_credential" : candidate.memory_type,
    importance: candidate.importance ?? null,
    confidence: candidate.confidence ?? null,
    created_at: candidate.created_at ?? null,
    status: candidate.status,
  });
  return { ...candidate, score };
}

export async function listMemoryCandidatesForAdmin(client: MemoryBridgeDbClient, input: { userId: string; filters: CandidateListFilters }): Promise<{ candidates: ScoredMemoryCaptureCandidate[]; counts: Record<MemoryCandidateStatus, number> & { total: number }; warnings: string[] }> {
  const filters = input.filters ?? {};
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const status = filters.status ?? "pending";
  const sort = filters.sort ?? "newest";
  let query = client.from<MemoryCaptureCandidate>("memory_capture_candidates").select("*").eq("user_id", input.userId).limit(limit);
  if (filters.namespace) query = query.eq("namespace", filters.namespace);
  if (status !== "all") query = query.eq("status", status);
  if (filters.sensitivity && filters.sensitivity !== "all") query = query.eq("sensitivity", filters.sensitivity);
  const orderColumn = sort === "importance" ? "importance" : sort === "confidence" ? "confidence" : sort === "sensitivity" ? "sensitivity" : "created_at";
  query = query.order(orderColumn, { ascending: false });
  const result = await (query as unknown as Promise<{ data: MemoryCaptureCandidate[] | null; error: { message: string } | null }>);
  const countQuery = client.from<MemoryCaptureCandidate>("memory_capture_candidates").select("*").eq("user_id", input.userId).limit(1000);
  const counted = await ((filters.namespace ? countQuery.eq("namespace", filters.namespace) : countQuery) as unknown as Promise<{ data: MemoryCaptureCandidate[] | null; error: { message: string } | null }>);
  const all = counted.data ?? [];
  return {
    candidates: (result.data ?? []).map(redact).map(attachScore),
    counts: { pending: all.filter((c) => c.status === "pending").length, blocked_secret: all.filter((c) => c.status === "blocked_secret").length, approved: all.filter((c) => c.status === "approved").length, rejected: all.filter((c) => c.status === "rejected").length, captured: all.filter((c) => c.status === "captured").length, duplicate: all.filter((c) => c.status === "duplicate").length, total: all.length },
    warnings: [result.error?.message, counted.error?.message, filters.limit && filters.limit > 100 ? "limit_capped_at_100" : undefined].filter(Boolean) as string[],
  };
}
