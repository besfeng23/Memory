/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import {
  scoreMemoryUsefulness,
  computeRetrievalWeight,
  rankMemoriesByRetrievalWeight,
  memoryRetrievalWeight,
  summarizeMemoryScore,
  clamp01,
} from "../lib/services/memory-usefulness-scoring-service";
import { evaluatePruningRecommendation, findPruningCandidates, runPhase5dMaintenance } from "../lib/services/memory-pruning-service";
import { getHybridMemoryContext } from "../lib/services/memory-hybrid-retrieval-service";
import { discoverEnvKeys, isRequiredProviderKey } from "../lib/services/env-discovery-service";
import { classifyEnvKey } from "../lib/services/env-validation-service";
import { buildEnvDriftReport } from "../lib/services/env-drift-service";

// Stable "now" so freshness/decay is deterministic.
const NOW = Date.parse("2026-06-29T00:00:00.000Z");

// In-memory bridge client matching the Phase 5C test mock shape (thenable list queries).
function client(seed: Partial<Record<string, any[]>> = {}) {
  const rows: Record<string, any[]> = { memory_events: [], memory_capture_candidates: [], memory_feedback_events: [], memory_profiles: [], memory_open_loops: [], memory_context_packs: [], memory_pruning_candidates: [], audit_logs: [], ...seed };
  return {
    rows,
    from(table: string) {
      let selected = [...(rows[table] ?? [])];
      let patch: any; let insertValue: any;
      const api: any = {
        select: () => api,
        eq: (k: string, v: any) => { selected = selected.filter((r) => r[k] === v); return api; },
        neq: (k: string, v: any) => { selected = selected.filter((r) => r[k] !== v); return api; },
        order: (k: string, opt: any) => { selected.sort((a, b) => (opt?.ascending ? String(a[k] ?? "").localeCompare(String(b[k] ?? "")) : String(b[k] ?? "").localeCompare(String(a[k] ?? "")))); return api; },
        limit: (n: number) => { selected = selected.slice(0, n); return api; },
        update: (v: any) => { patch = v; return api; },
        insert: (v: any) => { insertValue = v; return api; },
        single: async () => {
          if (insertValue) { const row = { id: `${table}-${rows[table].length + 1}`, ...insertValue }; rows[table].push(row); return { data: row, error: null }; }
          if (patch) { for (const r of selected) Object.assign(r, patch); return { data: selected[0] ?? null, error: selected[0] ? null : { message: "not found" } }; }
          return { data: selected[0] ?? null, error: selected[0] ? null : { message: "not found" } };
        },
        then: (resolve: any) => resolve({ data: selected, error: null }),
      };
      return api;
    },
  } as any;
}

describe("Phase 5D usefulness scoring", () => {
  it("clamps every score to 0..1", () => {
    const samples = [{ text: "I prefer concise answers" }, { text: "random note" }, { text: "Vercel production deployment is READY", created_at: "2026-06-28T00:00:00Z" }, { text: "debug stack trace request id 1a2b" }];
    for (const s of samples) {
      const b = computeRetrievalWeight(s, NOW);
      for (const v of [b.usefulness_score, b.confidence_score, b.freshness_score, b.feedback_score, b.contradiction_score, b.retrieval_weight]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    expect(clamp01(5)).toBe(1);
    expect(clamp01(-3)).toBe(0);
  });

  it("blocks secret/token-like content to zero usefulness and never retains it", () => {
    const secret = { text: "api_key=sk-abcdef0123456789abcdef0123" };
    const u = scoreMemoryUsefulness(secret, NOW);
    expect(u.blocked).toBe(true);
    expect(u.score).toBe(0);
    const w = computeRetrievalWeight(secret, NOW);
    expect(w.blocked).toBe(true);
    expect(w.retrieval_weight).toBe(0);
    expect(summarizeMemoryScore(secret, NOW).labels).toContain("Blocked: sensitive");
  });

  it("ranks a durable user preference above a transient debug log", () => {
    const pref = { text: "I prefer you to be concise and don't overpraise", created_at: "2026-06-28T00:00:00Z" };
    const dbg = { text: "debug stack trace request id abc one-off log line", created_at: "2026-06-28T00:00:00Z" };
    expect(computeRetrievalWeight(pref, NOW).retrieval_weight).toBeGreaterThan(computeRetrievalWeight(dbg, NOW).retrieval_weight);
  });

  it("ranks a current production fact above an old one of the same kind", () => {
    const fresh = { text: "Pandora production deployment is READY on Vercel", created_at: "2026-06-28T00:00:00Z" };
    const old = { text: "Pandora production deployment is READY on Vercel", created_at: "2026-01-01T00:00:00Z" };
    expect(computeRetrievalWeight(fresh, NOW).retrieval_weight).toBeGreaterThan(computeRetrievalWeight(old, NOW).retrieval_weight);
  });
});

describe("Phase 5D review-first pruning", () => {
  it("flags a stale operational memory as a pruning candidate without mutating or deleting it", () => {
    const stale = { id: "e1", namespace: "real_life" as const, text: "Pandora Vercel deployment status build log update", created_at: "2026-02-01T00:00:00Z" };
    const before = JSON.stringify(stale);
    const candidates = findPruningCandidates([stale], NOW);
    expect(candidates).toHaveLength(1);
    expect(["stale", "low_value"]).toContain(candidates[0].category);
    expect(["archive", "review", "supersede", "keep"]).toContain(candidates[0].recommendation);
    expect(JSON.stringify(stale)).toBe(before); // never mutated, never deleted
  });

  it("recommends supersede when a newer same-subject verified memory replaces an older one", () => {
    const older = { id: "old", namespace: "real_life" as const, text: "Pandora production deployment is READY", created_at: "2026-03-01T00:00:00Z" };
    const newer = { id: "new", namespace: "real_life" as const, text: "Pandora production deployment is READY again after rollback", created_at: "2026-06-20T00:00:00Z" };
    const ev = evaluatePruningRecommendation(older, [older, newer], NOW);
    expect(ev.category).toBe("superseded");
    expect(ev.recommendation).toBe("supersede");
    expect(ev.superseded_by_memory_id).toBe("new");
  });

  it("protects high-confidence durable memory from pruning", () => {
    const pref = { id: "p1", namespace: "real_life" as const, text: "I prefer blunt execution-focused answers and don't overpraise", confidence: 0.95, created_at: "2026-06-20T00:00:00Z" };
    const ev = evaluatePruningRecommendation(pref, [pref], NOW);
    expect(ev.category).toBe("keep");
    expect(ev.recommendation).toBe("keep");
    expect(ev.protected).toBe(true);
  });

  it("flags secret-like memory as unsafe and never retains it", () => {
    const unsafe = { id: "s1", namespace: "real_life" as const, text: "token=sk-abcdef0123456789abcdef0123 from prod" };
    const ev = evaluatePruningRecommendation(unsafe, [unsafe], NOW);
    expect(ev.category).toBe("unsafe");
    expect(ev.recommendation).toBe("review");
  });
});

describe("Phase 5D namespace isolation", () => {
  it("never lets an AU memory supersede a real_life memory", () => {
    const real = { id: "r1", namespace: "real_life" as const, text: "Pandora production deployment READY", created_at: "2026-03-01T00:00:00Z" };
    const au = { id: "a1", namespace: "au" as const, text: "Pandora production deployment READY again", created_at: "2026-06-20T00:00:00Z" };
    const ev = evaluatePruningRecommendation(real, [real, au], NOW);
    expect(ev.superseded_by_memory_id).not.toBe("a1");
    const grouped = findPruningCandidates([real, au], NOW);
    expect(grouped.every((c) => c.superseded_by_memory_id !== "a1")).toBe(true);
  });

  it("never returns AU events in real_life retrieval", async () => {
    const c = client({ memory_events: [
      { id: "e1", user_id: "u1", namespace: "au", extracted_summary: "AU canon Melodee chapter", status: "captured", created_at: "2026-06-28T00:00:00Z" },
      { id: "e2", user_id: "u1", namespace: "real_life", extracted_summary: "Pandora real production fact", status: "captured", created_at: "2026-06-28T00:00:00Z" },
    ] });
    const ctx = await getHybridMemoryContext(c, { user_id: "u1", namespace: "real_life" });
    expect(ctx.recent_events.every((e: any) => e.namespace === "real_life")).toBe(true);
    expect(JSON.stringify(ctx.recent_events)).not.toContain("AU canon");
  });
});

describe("Phase 5D confidence-weighted retrieval", () => {
  it("falls back safely when stored scores are null and never throws", () => {
    const noScores = [
      { text: "Pandora deployment", retrieval_weight: null, created_at: "2026-06-20T00:00:00Z" },
      { text: "I prefer concise", retrieval_weight: undefined, created_at: null },
      { text: "x" },
    ] as any[];
    expect(() => rankMemoriesByRetrievalWeight(noScores, NOW)).not.toThrow();
    expect(rankMemoriesByRetrievalWeight(noScores, NOW)).toHaveLength(3);
    expect(memoryRetrievalWeight({ text: "x" }, NOW)).toBeGreaterThanOrEqual(0);
  });

  it("preserves deterministic safety gates (semantic/embeddings/model stay disabled)", async () => {
    const keys = ["PANDORA_ENABLE_SEMANTIC_RETRIEVAL", "PANDORA_ENABLE_EMBEDDINGS", "PANDORA_ENABLE_MODEL_CALLS"] as const;
    const prev = keys.map((k) => [k, Object.prototype.hasOwnProperty.call(process.env, k), process.env[k]] as const);
    try {
      for (const k of keys) delete process.env[k];
      const c = client({ memory_events: [{ id: "e1", user_id: "u1", namespace: "real_life", extracted_summary: "fact", status: "captured", created_at: "2026-06-28T00:00:00Z" }] });
      const ctx = await getHybridMemoryContext(c, { user_id: "u1", namespace: "real_life" });
      expect(ctx.semantic_matches).toEqual([]);
      expect(ctx.warnings).toEqual(expect.arrayContaining(["semantic_retrieval_disabled", "embeddings_disabled", "model_calls_disabled"]));
    } finally {
      for (const [k, existed, value] of prev) { if (existed) process.env[k] = value as string; else delete process.env[k]; }
    }
  });
});

describe("Phase 5D env-broker safety (no drift regression)", () => {
  it("does not make optional Phase 5D flags required provider envs", async () => {
    for (const key of ["PANDORA_ENABLE_MEMORY_USEFULNESS_SCORING", "PANDORA_ENABLE_MEMORY_PRUNING", "PANDORA_MEMORY_PRUNING_MODE", "PANDORA_MEMORY_SCORING_VERSION"]) {
      expect(isRequiredProviderKey(key)).toBe(false);
    }
    const report = await buildEnvDriftReport({ ok: true, envs: [
      { key: "PANDORA_INTERNAL_JOB_TOKEN", updatedAt: 1 },
      { key: "PANDORA_ENV_BROKER_ENABLED", updatedAt: 1 },
      { key: "PANDORA_VERCEL_API_TOKEN", updatedAt: 1 },
    ] });
    expect(report.missingInProvider).toEqual([]);
    expect(report.severity).not.toBe("red");
  });

  it("keeps the required-provider set exactly the bootstrap keys and classifies Phase 5D config", () => {
    const required = discoverEnvKeys().filter((i) => i.requiredSuggestion).map((i) => i.key).sort();
    expect(required).toEqual(["PANDORA_ENV_BROKER_ENABLED", "PANDORA_INTERNAL_JOB_TOKEN", "PANDORA_VERCEL_API_TOKEN"]);
    expect(classifyEnvKey("PANDORA_MEMORY_PRUNING_MODE")).not.toBe("unknown");
    expect(classifyEnvKey("PANDORA_MEMORY_SCORING_VERSION")).not.toBe("unknown");
    const catalog = new Map(discoverEnvKeys().map((i) => [i.key, i.classificationSuggestion]));
    expect(catalog.get("PANDORA_ENABLE_MEMORY_USEFULNESS_SCORING")).toBe("runtime_flag");
    expect(catalog.get("PANDORA_ENABLE_MEMORY_PRUNING")).toBe("runtime_flag");
    expect(catalog.get("PANDORA_MEMORY_PRUNING_MODE")).not.toBe("unknown");
  });
});

describe("Phase 5D maintenance job", () => {
  it("dry-run scores and recommends without mutating destructive state", async () => {
    const c = client({ memory_events: [{ id: "e1", user_id: "u1", namespace: "real_life", extracted_summary: "Pandora Vercel deployment status build log", status: "captured", created_at: "2026-02-01T00:00:00Z" }] });
    const snapshot = JSON.stringify(c.rows);
    const r = await runPhase5dMaintenance(c, { user_id: "u1", namespace: "real_life", dry_run: true });
    expect(r.ok).toBe(true);
    expect(r.dry_run).toBe(true);
    expect(r.counts.scored).toBe(1);
    expect(JSON.stringify(c.rows)).toBe(snapshot); // nothing written, nothing deleted
    expect(c.rows.memory_pruning_candidates).toHaveLength(0);
  });

  it("returns a redacted summary that never contains raw secret values", async () => {
    const c = client({ memory_events: [{ id: "e1", user_id: "u1", namespace: "real_life", raw_text: "api_key=sk-abcdef0123456789abcdef0123 in prod", extracted_summary: "api_key=sk-abcdef0123456789abcdef0123 in prod", status: "captured", created_at: "2026-06-28T00:00:00Z" }] });
    const r = await runPhase5dMaintenance(c, { user_id: "u1", namespace: "real_life", dry_run: true });
    const blob = JSON.stringify(r);
    expect(blob).not.toContain("sk-abcdef0123456789abcdef0123");
    expect(blob).not.toContain("api_key=sk-");
    expect(r.counts.unsafe).toBeGreaterThanOrEqual(1);
  });

  it("writes pruning candidates idempotently across repeated non-dry runs", async () => {
    const env = { PANDORA_ENABLE_MEMORY_USEFULNESS_SCORING: "true", PANDORA_ENABLE_MEMORY_PRUNING: "true" } as NodeJS.ProcessEnv;
    const c = client({ memory_events: [{ id: "e1", user_id: "u1", namespace: "real_life", raw_text: "api_key=sk-abcdef0123456789abcdef0123", extracted_summary: "api_key=sk-abcdef0123456789abcdef0123", status: "captured", created_at: "2026-06-28T00:00:00Z" }] });
    const first = await runPhase5dMaintenance(c, { user_id: "u1", namespace: "real_life", dry_run: false }, env);
    const second = await runPhase5dMaintenance(c, { user_id: "u1", namespace: "real_life", dry_run: false }, env);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    const open = c.rows.memory_pruning_candidates.filter((r: any) => r.status === "open");
    expect(open).toHaveLength(1); // no duplicate open row on re-run
    expect(open[0].pruning_category).toBe("unsafe");
    expect(c.rows.audit_logs.some((a: any) => a.action === "memory_event_scored")).toBe(true);
  });

  it("rejects unauthorized job calls", async () => {
    const prev = process.env.PANDORA_INTERNAL_JOB_TOKEN;
    process.env.PANDORA_INTERNAL_JOB_TOKEN = "phase5d-test-token";
    try {
      const route = await import("../app/api/memory/jobs/phase-5d-maintenance/route");
      const noToken = await route.POST(new Request("http://x", { method: "POST", body: "{}" }) as any);
      expect(noToken.status).toBe(401);
      const wrong = await route.POST(new Request("http://x", { method: "POST", headers: { authorization: "Bearer nope" }, body: JSON.stringify({ namespace: "real_life" }) }) as any);
      expect(wrong.status).toBe(401);
    } finally {
      if (prev === undefined) delete process.env.PANDORA_INTERNAL_JOB_TOKEN; else process.env.PANDORA_INTERNAL_JOB_TOKEN = prev;
    }
  });
});

describe("Phase 5D routes with mocked backend", () => {
  it("authorized dry-run returns ok with a redacted, non-secret summary (server-derived user)", async () => {
    const prevToken = process.env.PANDORA_INTERNAL_JOB_TOKEN;
    const prevUser = process.env.PANDORA_MEMORY_BRIDGE_USER_ID;
    vi.resetModules();
    vi.doMock("@/lib/supabase/bridge-admin", () => {
      const rows: Record<string, any[]> = { memory_events: [{ id: "e1", user_id: "u1", namespace: "real_life", raw_text: "api_key=sk-abcdef0123456789abcdef0123 Pandora deploy", extracted_summary: "api_key=sk-abcdef0123456789abcdef0123 Pandora deploy", status: "captured", created_at: "2026-06-28T00:00:00.000Z" }], memory_pruning_candidates: [] };
      const make = (table: string) => { const selected = [...(rows[table] ?? [])]; const api: any = { select: () => api, eq: () => api, neq: () => api, order: () => api, limit: () => api, update: () => api, insert: () => api, single: async () => ({ data: selected[0] ?? null, error: null }), then: (resolve: any) => resolve({ data: selected, error: null }) }; return api; };
      return { createSupabaseBridgeAdminClient: () => ({ from: (t: string) => make(t) }) };
    });
    try {
      process.env.PANDORA_INTERNAL_JOB_TOKEN = "phase5d-test-token";
      process.env.PANDORA_MEMORY_BRIDGE_USER_ID = "u1"; // server-derived identity; body cannot set the user
      const route = await import("../app/api/memory/jobs/phase-5d-maintenance/route");
      const res = await route.POST(new Request("http://x", { method: "POST", headers: { authorization: "Bearer phase5d-test-token", "content-type": "application/json" }, body: JSON.stringify({ namespace: "real_life", dryRun: true }) }) as any);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.dry_run).toBe(true);
      expect(JSON.stringify(body)).not.toContain("sk-abcdef0123456789abcdef0123");
    } finally {
      if (prevToken === undefined) delete process.env.PANDORA_INTERNAL_JOB_TOKEN; else process.env.PANDORA_INTERNAL_JOB_TOKEN = prevToken;
      if (prevUser === undefined) delete process.env.PANDORA_MEMORY_BRIDGE_USER_ID; else process.env.PANDORA_MEMORY_BRIDGE_USER_ID = prevUser;
      vi.doUnmock("@/lib/supabase/bridge-admin");
      vi.resetModules();
    }
  });

  it("status route requires the internal job token", async () => {
    const prev = process.env.PANDORA_INTERNAL_JOB_TOKEN;
    process.env.PANDORA_INTERNAL_JOB_TOKEN = "phase5d-test-token";
    try {
      const route = await import("../app/api/admin/memory/phase-5d/status/route");
      const denied = await route.GET(new Request("http://x") as any);
      expect(denied.status).toBe(401);
    } finally {
      if (prev === undefined) delete process.env.PANDORA_INTERNAL_JOB_TOKEN; else process.env.PANDORA_INTERNAL_JOB_TOKEN = prev;
    }
  });
});
