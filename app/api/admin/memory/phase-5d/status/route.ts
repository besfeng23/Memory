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
  let totals: { scored: number | null; stale_candidates: number; superseded_candidates: number; low_value_candidates: number } = { scored: null, stale_candidates: 0, superseded_candidates: 0, low_value_candidates: 0 };
  let lastScoringRun: string | null = null;

  if (userId) {
    try {
      const client = createSupabaseBridgeAdminClient();
      const pruning = await (client.from("memory_pruning_candidates").select("pruning_category,status").eq("user_id", userId).eq("status", "open").limit(1000) as unknown as Promise<{ data: PruningRow[] | null; error: { message: string } | null }>);
      const rows = pruning.data ?? [];
      totals = {
        scored: null,
        stale_candidates: rows.filter((r) => r.pruning_category === "stale").length,
        superseded_candidates: rows.filter((r) => r.pruning_category === "superseded").length,
        low_value_candidates: rows.filter((r) => r.pruning_category === "low_value").length,
      };
      const scored = await (client.from("memory_events").select("scored_at").eq("user_id", userId).order("scored_at", { ascending: false }).limit(1) as unknown as Promise<{ data: { scored_at?: string | null }[] | null; error: { message: string } | null }>);
      lastScoringRun = (scored.data ?? [])[0]?.scored_at ?? null;
      totals.scored = (scored.data ?? []).length ? null : 0;
      if (pruning.error) warnings.push("pruning_counts_unavailable");
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
