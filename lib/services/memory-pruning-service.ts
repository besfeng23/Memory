/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MemoryBridgeDbClient, MemoryBridgeNamespace } from "@/lib/services/memory-bridge-service";
import { redactSecrets, detectSecrets } from "@/lib/services/memory-redaction-service";
import { resolvePhase5dConfig, PHASE_5D_DEFAULT_SCORING_VERSION } from "@/lib/config/phase-5d-config";
import {
  classifyContent,
  classifyStaleness,
  computeRetrievalWeight,
  isProtectedMemory,
  scoreMemoryUsefulness,
  type ScoreableMemory,
  type StaleStatus,
} from "@/lib/services/memory-usefulness-scoring-service";

// Phase 5D review-first pruning. This module NEVER hard-deletes memory. It produces
// recommendations (keep / archive / supersede / review) that an operator must act on.

export type PruningCategory = "keep" | "stale" | "superseded" | "low_value" | "unsafe" | "duplicate";
export type PruningRecommendation = "keep" | "archive" | "supersede" | "review";

export type PruningCandidate = {
  memory_id?: string | null;
  namespace: MemoryBridgeNamespace;
  category: PruningCategory;
  recommendation: PruningRecommendation;
  reason: string;
  stale_status: StaleStatus;
  retrieval_weight: number;
  superseded_by_memory_id?: string | null;
  protected: boolean;
};

export type ScoreableMemoryRecord = ScoreableMemory & { id?: string | null; namespace?: MemoryBridgeNamespace | string | null };

const subjectKey = (text: string) =>
  (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .split("_")
    .filter(Boolean)
    .slice(0, 6)
    .join("_") || "global";

// A coarse subject signature so superseding/duplication only compares memories that are
// plausibly about the same project/person/state. Conservative by design.
function projectSubject(memory: ScoreableMemoryRecord): string {
  const text = String(memory.text ?? "").toLowerCase();
  const projects = ["pandora", "plp", "hatid", "speedcash", "speedypay", "retargetos", "growthos", "red-apple"];
  const hit = projects.find((p) => text.includes(p));
  return hit ?? subjectKey(text).slice(0, 24);
}

function normalizedMeaning(memory: ScoreableMemoryRecord): string {
  return String(memory.text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function evaluatePruningRecommendation(memory: ScoreableMemoryRecord, peers: ScoreableMemoryRecord[], now: number = Date.now()): PruningCandidate {
  const namespace = (memory.namespace === "au" ? "au" : "real_life") as MemoryBridgeNamespace;
  // Hard isolation: peers from a different namespace can never influence this memory.
  const sameNamespacePeers = peers.filter((p) => p !== memory && (p.namespace === "au" ? "au" : "real_life") === namespace);
  const breakdown = computeRetrievalWeight(memory, now);
  const stale = classifyStaleness(memory, now);
  const protectedMemory = isProtectedMemory(memory, now);
  const base = { memory_id: memory.id ?? null, namespace, stale_status: stale, retrieval_weight: breakdown.retrieval_weight, protected: protectedMemory } as const;

  // 1. Unsafe: secret-like content must never be retained.
  if (breakdown.blocked || detectSecrets(String(memory.text ?? "")).detected) {
    return { ...base, category: "unsafe", recommendation: "review", reason: "Secret-like or sensitive content detected; should not be retained.", protected: false };
  }

  // 2. Superseded: explicit flag, or a newer same-subject production fact in the same namespace.
  // Checked before "protected keep" so a newer verified status always surfaces for review.
  if (memory.status === "superseded" || memory.superseded_by_memory_id) {
    return { ...base, category: "superseded", recommendation: "supersede", reason: "Memory is marked superseded by a newer verified memory.", superseded_by_memory_id: memory.superseded_by_memory_id ?? null };
  }
  const subject = projectSubject(memory);
  const isOperational = classifyContent(memory) === "production_fact";
  if (isOperational) {
    // Compare real timestamps, not strings, so a null/invalid created_at can never "win".
    const createdAt = Date.parse(String(memory.created_at ?? ""));
    const newer = Number.isFinite(createdAt)
      ? sameNamespacePeers.find((p) => {
          const peerCreatedAt = Date.parse(String(p.created_at ?? ""));
          return classifyContent(p) === "production_fact" && projectSubject(p) === subject && Number.isFinite(peerCreatedAt) && peerCreatedAt > createdAt;
        })
      : undefined;
    if (newer) {
      return { ...base, category: "superseded", recommendation: "supersede", reason: `Newer verified status for "${subject}" supersedes this operational memory.`, superseded_by_memory_id: newer.id ?? null };
    }
  }

  // 3. Protected durable/high-confidence memory is always kept (never pruned without review).
  if (protectedMemory) {
    return { ...base, category: "keep", recommendation: "keep", reason: "Protected high-confidence durable memory." };
  }

  // 4. Duplicate: same meaning as a stronger (higher-weight) peer in the same namespace.
  const meaning = normalizedMeaning(memory);
  if (meaning) {
    const stronger = sameNamespacePeers.find((p) => normalizedMeaning(p) === meaning && computeRetrievalWeight(p, now).retrieval_weight > breakdown.retrieval_weight);
    if (stronger) {
      return { ...base, category: "duplicate", recommendation: "archive", reason: "Duplicate of a stronger memory with the same meaning.", superseded_by_memory_id: stronger.id ?? null };
    }
  }

  // 5. Stale: outdated operational status.
  if (stale === "stale") {
    return { ...base, category: "stale", recommendation: "archive", reason: "Outdated operational status; freshness has decayed." };
  }

  // 6. Low value: low usefulness and rarely retrieved.
  const usefulness = scoreMemoryUsefulness(memory, now).score;
  const retrieval = Math.max(0, Number(memory.retrieval_count ?? 0) || 0);
  if ((usefulness < 0.35 && retrieval < 1) || stale === "archived_candidate") {
    return { ...base, category: "low_value", recommendation: "archive", reason: "Low usefulness and rarely retrieved." };
  }

  return { ...base, category: "keep", recommendation: "keep", reason: "Within active retention window." };
}

export function findPruningCandidates(memories: ScoreableMemoryRecord[], now: number = Date.now()): PruningCandidate[] {
  // Group strictly by namespace so AU/story memory can never contaminate real_life pruning.
  const byNamespace = new Map<MemoryBridgeNamespace, ScoreableMemoryRecord[]>();
  for (const memory of memories) {
    const ns = (memory.namespace === "au" ? "au" : "real_life") as MemoryBridgeNamespace;
    byNamespace.set(ns, [...(byNamespace.get(ns) ?? []), memory]);
  }
  const out: PruningCandidate[] = [];
  for (const [, group] of byNamespace) {
    for (const memory of group) {
      const evaluation = evaluatePruningRecommendation(memory, group, now);
      if (evaluation.category !== "keep") out.push(evaluation);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Maintenance runner (Phase 5D job). Scores recent memories and produces pruning
// recommendations. Strictly non-destructive: it never deletes, and only writes additive
// score columns / review-only pruning candidates when the relevant gates are enabled and
// dryRun is false. The returned summary is always redacted (no raw memory text).
// ---------------------------------------------------------------------------

export type Phase5dMaintenanceScope = { user_id: string; namespace: MemoryBridgeNamespace; dry_run?: boolean };

export type Phase5dMaintenanceResult = {
  ok: boolean;
  dry_run: boolean;
  namespace: MemoryBridgeNamespace;
  scoring_version: string;
  scoring_enabled: boolean;
  pruning_enabled: boolean;
  pruning_mode: string;
  counts: { scored: number; active: number; aging: number; stale: number; superseded: number; low_value: number; unsafe: number; duplicate: number; protected: number; persisted_scores: number; recorded_candidates: number };
  candidates: { memory_id: string | null; category: PruningCategory; recommendation: PruningRecommendation; reason: string; stale_status: StaleStatus; retrieval_weight: number }[];
  warnings: string[];
  blockers: string[];
  next_step?: string;
};

const rawTextOf = (row: any) => [row.extracted_summary, row.summary, row.title, row.redacted_excerpt, row.raw_text, row.raw_excerpt].filter(Boolean).join(" — ");
const textOf = (row: any) => redactSecrets(rawTextOf(row)).replace(/\s+/g, " ").trim();

function toScoreable(row: any, namespace: MemoryBridgeNamespace): ScoreableMemoryRecord {
  // Detect secrets on the raw text, but only ever carry the redacted text forward. This keeps
  // unsafe content flaggable while guaranteeing no raw secret enters scoring output.
  const containsSecret = row.status === "blocked_secret" || detectSecrets(rawTextOf(row)).detected;
  return {
    id: row.id ?? null,
    namespace,
    text: textOf(row),
    memory_type: containsSecret ? "secret_or_credential" : (row.memory_type ?? null),
    source: row.source ?? null,
    importance: row.importance ?? null,
    confidence: row.confidence ?? null,
    created_at: row.created_at ?? row.reviewed_at ?? null,
    updated_at: row.updated_at ?? null,
    last_retrieved_at: row.last_retrieved_at ?? null,
    retrieval_count: row.retrieval_count ?? null,
    positive_feedback_count: row.positive_feedback_count ?? null,
    negative_feedback_count: row.negative_feedback_count ?? null,
    last_feedback_at: row.last_feedback_at ?? null,
    status: row.status ?? null,
    superseded_by_memory_id: row.superseded_by_memory_id ?? null,
  };
}

async function listRecent(client: MemoryBridgeDbClient, table: string, scope: Phase5dMaintenanceScope, limit = 200): Promise<any[]> {
  const query: any = client.from(table).select("*").eq("user_id", scope.user_id).eq("namespace", scope.namespace).order("created_at", { ascending: false }).limit(limit);
  const result = await (query as Promise<{ data: any[] | null; error: { message: string } | null }>);
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return result.data ?? [];
}

export async function runPhase5dMaintenance(client: MemoryBridgeDbClient, scope: Phase5dMaintenanceScope, env: Partial<NodeJS.ProcessEnv> = process.env): Promise<Phase5dMaintenanceResult> {
  const config = resolvePhase5dConfig(env);
  const now = Date.now();
  const dryRun = scope.dry_run !== false;
  const base: Phase5dMaintenanceResult = {
    ok: false,
    dry_run: dryRun,
    namespace: scope.namespace,
    scoring_version: config.scoringVersion || PHASE_5D_DEFAULT_SCORING_VERSION,
    scoring_enabled: config.usefulnessScoringEnabled,
    pruning_enabled: config.pruningEnabled,
    pruning_mode: config.pruningMode,
    counts: { scored: 0, active: 0, aging: 0, stale: 0, superseded: 0, low_value: 0, unsafe: 0, duplicate: 0, protected: 0, persisted_scores: 0, recorded_candidates: 0 },
    candidates: [],
    warnings: [],
    blockers: [],
  };
  try {
    const events = await listRecent(client, "memory_events", scope);
    const scoreables = events.map((row) => toScoreable(row, scope.namespace));
    base.counts.scored = scoreables.length;
    for (const memory of scoreables) {
      const stale = classifyStaleness(memory, now);
      if (stale === "active") base.counts.active += 1;
      else if (stale === "aging") base.counts.aging += 1;
      else if (stale === "stale") base.counts.stale += 1;
      else if (stale === "superseded") base.counts.superseded += 1;
      if (isProtectedMemory(memory, now)) base.counts.protected += 1;
    }
    const candidates = findPruningCandidates(scoreables, now);
    for (const candidate of candidates) {
      if (candidate.category === "low_value") base.counts.low_value += 1;
      if (candidate.category === "unsafe") base.counts.unsafe += 1;
      if (candidate.category === "duplicate") base.counts.duplicate += 1;
    }
    base.candidates = candidates.map((c) => ({ memory_id: c.memory_id ?? null, category: c.category, recommendation: c.recommendation, reason: c.reason, stale_status: c.stale_status, retrieval_weight: c.retrieval_weight }));

    if (!dryRun && config.usefulnessScoringEnabled) {
      const eventById = new Map(events.map((e) => [e.id, e]));
      const scoredAt = new Date(now).toISOString();
      for (const memory of scoreables) {
        if (!memory.id) continue;
        const breakdown = computeRetrievalWeight(memory, now, config.scoringVersion);
        const stale = classifyStaleness(memory, now);
        const after = { usefulness_score: breakdown.usefulness_score, confidence_score: breakdown.confidence_score, freshness_score: breakdown.freshness_score, contradiction_score: breakdown.contradiction_score, retrieval_weight: breakdown.retrieval_weight, stale_status: stale, scoring_version: config.scoringVersion, scored_at: scoredAt };
        const upd = await client.from("memory_events").update(after).eq("id", memory.id).eq("user_id", scope.user_id).eq("namespace", scope.namespace).select("*").single();
        if (upd.error) { base.warnings.push(`score_write_skipped:${memory.id}`); continue; }
        base.counts.persisted_scores += 1;
        // Append an audit trail so persisted score changes are explainable in the proof flow.
        // (memory_patches is FK-bound to memory_items, so audit_logs is the correct table for memory_events.)
        const prior = eventById.get(memory.id);
        const before = { usefulness_score: prior?.usefulness_score ?? null, retrieval_weight: prior?.retrieval_weight ?? null, stale_status: prior?.stale_status ?? null, scoring_version: prior?.scoring_version ?? null, scored_at: prior?.scored_at ?? null };
        try {
          await client.from("audit_logs").insert({ user_id: scope.user_id, namespace: scope.namespace, action: "memory_event_scored", table_name: "memory_events", record_id: memory.id, before_snapshot: before, after_snapshot: after, metadata: { phase: "5D", scoring_version: config.scoringVersion, appendOnly: true } }).select("*").single();
        } catch { base.warnings.push(`score_audit_skipped:${memory.id}`); }
      }
      if (config.pruningEnabled) {
        for (const candidate of candidates) {
          // Idempotent: skip if an open candidate already exists for this memory/category, so
          // re-running the job (retry/schedule) never inflates the review queue.
          if (candidate.memory_id) {
            const existing = await (client.from("memory_pruning_candidates").select("id").eq("user_id", scope.user_id).eq("namespace", scope.namespace).eq("memory_id", candidate.memory_id).eq("pruning_category", candidate.category).eq("status", "open").limit(1) as unknown as Promise<{ data: any[] | null; error: { message: string } | null }>);
            if ((existing.data ?? []).length) { base.warnings.push("pruning_candidate_already_open"); continue; }
          }
          const ins = await client
            .from("memory_pruning_candidates")
            .insert({ user_id: scope.user_id, namespace: scope.namespace, memory_id: candidate.memory_id, pruning_category: candidate.category, recommendation: candidate.recommendation, reason: candidate.reason, stale_status: candidate.stale_status, retrieval_weight: candidate.retrieval_weight, superseded_by_memory_id: candidate.superseded_by_memory_id ?? null, scoring_version: config.scoringVersion, status: "open" })
            .select("*")
            .single();
          if (!ins.error) base.counts.recorded_candidates += 1;
          else base.warnings.push("pruning_candidate_write_skipped");
        }
      }
    }
    return { ...base, ok: true, next_step: dryRun ? "Review candidates; re-run with dryRun:false and scoring/pruning gates enabled to persist." : undefined };
  } catch (error) {
    return { ...base, blockers: ["phase_5d_maintenance_failed"], warnings: [error instanceof Error ? error.message : "unknown failure"], next_step: "Check memory table schemas and RLS." };
  }
}
