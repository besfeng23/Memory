import { NextRequest, NextResponse } from "next/server";
import { createSupabaseBridgeAdminClient } from "@/lib/supabase/bridge-admin";
import { resolvePhase5dConfig, phase5dGatesSummary } from "@/lib/config/phase-5d-config";

export const dynamic = "force-dynamic";

function bearer(request: NextRequest): string | undefined {
  const [scheme, token] = (request.headers.get("authorization") ?? "").split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

type PruningRow = { pruning_category?: string | null; status?: string | null };

export async function GET(request: NextRequest) {
  // Operator protection: the internal job token (a server-only secret) is required.
  const token = process.env.PANDORA_INTERNAL_JOB_TOKEN;
  if (!token || bearer(request) !== token) {
    return NextResponse.json({ ok: false, error: { code: "internal_job_token_required" } }, { status: 401 });
  }
  const config = resolvePhase5dConfig();
  const userId = process.env.PANDORA_MEMORY_BRIDGE_USER_ID;
  const warnings: string[] = [];
  type Totals = { scored: number | null; stale_candidates: number; superseded_candidates: number; low_value_candidates: number; unsafe_candidates: number; duplicate_candidates: number };
  let totals: Totals = { scored: null, stale_candidates: 0, superseded_candidates: 0, low_value_candidates: 0, unsafe_candidates: 0, duplicate_candidates: 0 };
  let lastScoringRun: string | null = null;

  if (userId) {
    try {
      const client = createSupabaseBridgeAdminClient();
      const pruning = await (client.from("memory_pruning_candidates").select("pruning_category,status").eq("user_id", userId).eq("status", "open").limit(2000) as unknown as Promise<{ data: PruningRow[] | null; error: { message: string } | null }>);
      const rows = pruning.data ?? [];
      const countOf = (category: string) => rows.filter((r) => r.pruning_category === category).length;
      // Surface every category the pruning service can emit, including the ones that most need
      // operator attention (unsafe, duplicate).
      totals = {
        scored: null,
        stale_candidates: countOf("stale"),
        superseded_candidates: countOf("superseded"),
        low_value_candidates: countOf("low_value"),
        unsafe_candidates: countOf("unsafe"),
        duplicate_candidates: countOf("duplicate"),
      };
      if (pruning.error) warnings.push("pruning_counts_unavailable");
      // Exact count of scored events (head:true returns count without rows).
      const scoredCount = await (client.from("memory_events").select("id", { count: "exact", head: true }).eq("user_id", userId).not("scored_at", "is", null) as unknown as Promise<{ count: number | null; error: { message: string } | null }>);
      totals.scored = scoredCount.error ? null : scoredCount.count ?? 0;
      // Latest run = newest non-null scored_at.
      const lastRun = await (client.from("memory_events").select("scored_at").eq("user_id", userId).not("scored_at", "is", null).order("scored_at", { ascending: false }).limit(1) as unknown as Promise<{ data: { scored_at?: string | null }[] | null; error: { message: string } | null }>);
      lastScoringRun = (lastRun.data ?? [])[0]?.scored_at ?? null;
    } catch {
      warnings.push("memory_backend_unavailable");
    }
  } else {
    warnings.push("bridge_user_id_not_configured");
  }

  return NextResponse.json({
    ok: true,
    scoring_enabled: config.usefulnessScoringEnabled,
    scoring_version: config.scoringVersion,
    pruning_enabled: config.pruningEnabled,
    pruning_mode: config.pruningMode,
    totals,
    last_scoring_run: lastScoringRun,
    gates: phase5dGatesSummary(),
    warnings,
  });
}
