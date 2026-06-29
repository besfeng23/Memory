import { detectSecrets } from "@/lib/services/memory-redaction-service";
import { PHASE_5D_DEFAULT_SCORING_VERSION } from "@/lib/config/phase-5d-config";

// Phase 5D deterministic memory usefulness scoring.
//
// This module is intentionally model-free and side-effect free. Every score is a pure
// function of the memory's structured fields and a deterministic `now`, so behavior is
// reproducible and never depends on embeddings, retrieval, or model calls. Secrets are
// always blocked to a zero score and never retained.

export type MemoryNamespace = "real_life" | "au";

export type UsefulnessCategory =
  | "durable_preference" // explicit user preference or durable personal fact
  | "production_fact" // current project status, deployment state, repo/production facts
  | "task_state" // temporary task state, decays faster
  | "transient" // debug logs, transient ids, one-off outputs
  | "secret" // secret/credential content, always blocked
  | "general";

export type StaleStatus = "active" | "aging" | "stale" | "superseded" | "archived_candidate";

export type ScoreableMemory = {
  text?: string | null;
  namespace?: MemoryNamespace | string | null;
  memory_type?: string | null;
  source?: string | null;
  importance?: number | null;
  confidence?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_retrieved_at?: string | null;
  retrieval_count?: number | null;
  positive_feedback_count?: number | null;
  negative_feedback_count?: number | null;
  last_feedback_at?: string | null;
  status?: string | null;
  superseded_by_memory_id?: string | null;
};

export type RetrievalWeightBreakdown = {
  usefulness_score: number;
  confidence_score: number;
  freshness_score: number;
  feedback_score: number;
  contradiction_score: number;
  retrieval_weight: number;
  category: UsefulnessCategory;
  blocked: boolean;
  scoring_version: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

const includesAny = (text: string, words: string[]) => words.some((w) => text.includes(w));

const DURABLE_PREFERENCE = ["i prefer", "from now on", "always", "never", "don't ", "dont ", "do not ", "be blunt", "be concise", "don't overpraise", "my preference", "i like", "i want you to", "i hate", "remember that i", "i am ", "i'm ", "my name is", "my goal"];
const PRODUCTION_FACT = ["production", "deployed", "deployment", "live", "ready", "vercel", "supabase", "migration", "repo", "github", "pr ", "merge", "ci ", "build", "commit", "branch", "rollback", "release", "env broker", "drift guard"];
const TASK_STATE = ["todo", "to do", "next action", "next step", "working on", "in progress", "pending task", "follow up", "follow-up", "need to", "should ", "task:"];
const TRANSIENT = ["debug", "stack trace", "traceback", "trace id", "request id", "req id", "correlation id", "log line", "one-off", "one off", "temporary", "scratch", "tmp ", "console.log", "exception:", "[debug]"];
const ACTIVE_PROJECT = ["pandora", "plp", "hatid", "speedcash", "speedypay", "retargetos", "growthos", "red-apple"];

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const CONTRADICTION_WORDS = ["contradict", "superseded", "supersede", "outdated", "no longer", "not anymore", "correction", "actually it's", "actually its", "replaced by", "obsolete", "deprecated", "was wrong", "incorrect earlier"];

function normalizedText(memory: ScoreableMemory): string {
  return String(memory.text ?? "").toLowerCase();
}

export function classifyContent(memory: ScoreableMemory): UsefulnessCategory {
  const raw = String(memory.text ?? "");
  // Structured type checks run BEFORE the blank-text fast path so a typed but empty-text
  // memory (e.g. a redacted blocked_secret candidate) is still classified correctly.
  if (memory.memory_type === "secret_or_credential") return "secret";
  if (memory.memory_type === "preference") return "durable_preference";
  if (!raw.trim()) return "general";
  // Secrets/credentials always win and are blocked.
  if (detectSecrets(raw).detected) return "secret";
  const text = raw.toLowerCase();
  if (includesAny(text, DURABLE_PREFERENCE)) return "durable_preference";
  if (includesAny(text, PRODUCTION_FACT)) return "production_fact";
  if (includesAny(text, TASK_STATE)) return "task_state";
  if (includesAny(text, TRANSIENT) || UUID_RE.test(raw)) return "transient";
  return "general";
}

const BASE_USEFULNESS: Record<UsefulnessCategory, number> = {
  durable_preference: 0.92,
  production_fact: 0.85,
  task_state: 0.55,
  transient: 0.25,
  secret: 0,
  general: 0.5,
};

// Freshness half-life (days). Durable preferences decay very slowly; operational/task
// and transient memories decay fast so stale operational details lose weight quickly.
const HALF_LIFE_DAYS: Record<UsefulnessCategory, number> = {
  durable_preference: 540,
  production_fact: 30,
  task_state: 7,
  transient: 2,
  secret: 1,
  general: 60,
};

const FALLBACK_CONFIDENCE: Record<UsefulnessCategory, number> = {
  durable_preference: 0.8,
  production_fact: 0.7,
  task_state: 0.5,
  transient: 0.3,
  secret: 0,
  general: 0.5,
};

function normalizeImportance(importance?: number | null): number | null {
  if (importance === null || importance === undefined || !Number.isFinite(importance)) return null;
  return clamp01(importance > 1 ? importance / 10 : importance);
}

function ageDays(memory: ScoreableMemory, now: number): number | null {
  const stamp = memory.updated_at ?? memory.created_at;
  if (!stamp) return null;
  const ms = Date.parse(stamp);
  if (Number.isNaN(ms)) return null;
  return Math.max(0, (now - ms) / DAY_MS);
}

export function scoreMemoryUsefulness(memory: ScoreableMemory, now: number = Date.now()): { score: number; category: UsefulnessCategory; blocked: boolean } {
  void now;
  const category = classifyContent(memory);
  if (category === "secret") return { score: 0, category, blocked: true };
  let base = BASE_USEFULNESS[category];
  // Transient details tied to an active project are worth a little more than raw noise.
  if (category === "transient" && includesAny(normalizedText(memory), ACTIVE_PROJECT)) base = 0.5;
  const importance = normalizeImportance(memory.importance);
  const nudge = importance === null ? 0 : (importance - 0.5) * 0.1;
  return { score: clamp01(base + nudge), category, blocked: false };
}

export function scoreFreshness(memory: ScoreableMemory, now: number = Date.now()): number {
  const category = classifyContent(memory);
  if (category === "secret") return 0;
  const age = ageDays(memory, now);
  if (age === null) return 0.5; // deterministic fallback when no timestamp exists
  return clamp01(Math.pow(0.5, age / HALF_LIFE_DAYS[category]));
}

export function scoreFeedback(memory: ScoreableMemory): number {
  const pos = Math.max(0, Number(memory.positive_feedback_count ?? 0) || 0);
  const neg = Math.max(0, Number(memory.negative_feedback_count ?? 0) || 0);
  const retrieval = Math.max(0, Number(memory.retrieval_count ?? 0) || 0);
  // Centered at 0.5; positive reinforcement and repeated retrieval raise it, negatives lower it.
  return clamp01(0.5 + (pos - neg) * 0.1 + Math.min(retrieval, 10) * 0.02);
}

export function scoreContradictionRisk(memory: ScoreableMemory, now: number = Date.now()): number {
  void now;
  if (memory.status === "superseded" || memory.superseded_by_memory_id) return 0.85;
  if (includesAny(normalizedText(memory), CONTRADICTION_WORDS)) return 0.6;
  return 0.1;
}

export function resolveConfidence(memory: ScoreableMemory, category: UsefulnessCategory): number {
  if (memory.confidence !== null && memory.confidence !== undefined && Number.isFinite(memory.confidence)) {
    return clamp01(Number(memory.confidence));
  }
  return FALLBACK_CONFIDENCE[category];
}

export function computeRetrievalWeight(memory: ScoreableMemory, now: number = Date.now(), scoringVersion: string = PHASE_5D_DEFAULT_SCORING_VERSION): RetrievalWeightBreakdown {
  const { score: usefulness, category, blocked } = scoreMemoryUsefulness(memory, now);
  if (blocked) {
    return { usefulness_score: 0, confidence_score: 0, freshness_score: 0, feedback_score: 0, contradiction_score: 1, retrieval_weight: 0, category, blocked: true, scoring_version: scoringVersion };
  }
  const confidence = resolveConfidence(memory, category);
  const freshness = scoreFreshness(memory, now);
  const feedback = scoreFeedback(memory);
  const contradiction = scoreContradictionRisk(memory, now);
  const weight = clamp01(usefulness * 0.4 + confidence * 0.25 + freshness * 0.2 + feedback * 0.1 - contradiction * 0.2);
  return {
    usefulness_score: usefulness,
    confidence_score: confidence,
    freshness_score: freshness,
    feedback_score: feedback,
    contradiction_score: contradiction,
    retrieval_weight: weight,
    category,
    blocked: false,
    scoring_version: scoringVersion,
  };
}

export function isProtectedMemory(memory: ScoreableMemory, now: number = Date.now()): boolean {
  const { score, category, blocked } = scoreMemoryUsefulness(memory, now);
  if (blocked) return false;
  // Durable user preferences/personal facts are always protected once high-usefulness.
  if (category === "durable_preference" && score >= 0.8) return true;
  // Operational/production facts are only protected with an EXPLICIT high confidence, so a
  // stale operational status without backing confidence can still surface for review.
  const explicitConfidence = memory.confidence !== null && memory.confidence !== undefined && Number.isFinite(memory.confidence) ? clamp01(Number(memory.confidence)) : null;
  if (category === "production_fact" && explicitConfidence !== null && explicitConfidence >= 0.8) return true;
  return false;
}

export function classifyStaleness(memory: ScoreableMemory, now: number = Date.now()): StaleStatus {
  const { category, blocked } = scoreMemoryUsefulness(memory, now);
  if (blocked) return "archived_candidate";
  if (memory.status === "superseded" || memory.superseded_by_memory_id) return "superseded";
  const usefulness = scoreMemoryUsefulness(memory, now).score;
  const freshness = scoreFreshness(memory, now);
  const retrieval = Math.max(0, Number(memory.retrieval_count ?? 0) || 0);
  if (usefulness < 0.3 && retrieval < 1 && freshness < 0.3) return "archived_candidate";
  let status: StaleStatus = freshness >= 0.6 ? "active" : freshness >= 0.3 ? "aging" : "stale";
  // Durable/high-confidence memories are never marked fully stale without review.
  if (status === "stale" && isProtectedMemory(memory, now)) status = "aging";
  void category;
  return status;
}

// ---------------------------------------------------------------------------
// Human-readable labels for review UIs (Phase 5D / candidate review integration).
// Labels are intentionally plain words, not raw math, so reviewers can scan quickly.
// ---------------------------------------------------------------------------

export function usefulnessLabel(score: number): "High usefulness" | "Medium usefulness" | "Low usefulness" {
  if (score >= 0.7) return "High usefulness";
  if (score >= 0.4) return "Medium usefulness";
  return "Low usefulness";
}

export function stalenessLabel(status: StaleStatus): string {
  switch (status) {
    case "active": return "Active";
    case "aging": return "Aging";
    case "stale": return "Stale";
    case "superseded": return "Possibly superseded";
    case "archived_candidate": return "Archive candidate";
  }
}

export type MemoryScoreSummary = {
  usefulness_score: number;
  confidence_score: number;
  freshness_score: number;
  retrieval_weight: number;
  stale_status: StaleStatus;
  scoring_version: string;
  labels: string[];
};

export function summarizeMemoryScore(memory: ScoreableMemory, now: number = Date.now(), scoringVersion: string = PHASE_5D_DEFAULT_SCORING_VERSION): MemoryScoreSummary {
  const breakdown = computeRetrievalWeight(memory, now, scoringVersion);
  const stale = classifyStaleness(memory, now);
  const labels: string[] = [usefulnessLabel(breakdown.usefulness_score)];
  if (stale === "aging") labels.push("Aging");
  if (stale === "superseded") labels.push("Possibly superseded");
  if (stale === "stale" || stale === "archived_candidate") labels.push("Needs review");
  if (breakdown.blocked) labels.push("Blocked: sensitive");
  return {
    usefulness_score: breakdown.usefulness_score,
    confidence_score: breakdown.confidence_score,
    freshness_score: breakdown.freshness_score,
    retrieval_weight: breakdown.retrieval_weight,
    stale_status: stale,
    scoring_version: scoringVersion,
    labels,
  };
}

// ---------------------------------------------------------------------------
// Confidence-weighted ranking helper (Phase 5D / retrieval integration).
// Null-safe: records with no stored scores get a deterministic fallback weight computed
// from their text + timestamps, so ranking never breaks on older unscored rows.
// ---------------------------------------------------------------------------

export function memoryRetrievalWeight(memory: ScoreableMemory & { retrieval_weight?: number | null }, now: number = Date.now()): number {
  if (memory.retrieval_weight !== null && memory.retrieval_weight !== undefined && Number.isFinite(memory.retrieval_weight)) {
    return clamp01(Number(memory.retrieval_weight));
  }
  return computeRetrievalWeight(memory, now).retrieval_weight;
}

export function rankMemoriesByRetrievalWeight<T extends ScoreableMemory & { retrieval_weight?: number | null; created_at?: string | null }>(memories: T[], now: number = Date.now()): T[] {
  return memories
    .map((memory, index) => ({ memory, index, weight: memoryRetrievalWeight(memory, now) }))
    .sort((a, b) => (b.weight - a.weight) || (String(b.memory.created_at ?? "").localeCompare(String(a.memory.created_at ?? ""))) || (a.index - b.index))
    .map((entry) => entry.memory);
}

