import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseBridgeAdminClient } from "@/lib/supabase/bridge-admin";
import { runPhase5dMaintenance } from "@/lib/services/memory-pruning-service";

export const dynamic = "force-dynamic";

// Note: there is intentionally no `user_id` field. This job writes via the bridge admin
// client, so the target user is always server-derived (PANDORA_MEMORY_BRIDGE_USER_ID) and can
// never be chosen from the request body — a job-token holder cannot target another account.
const schema = z.object({
  namespace: z.enum(["real_life", "au"]),
  dryRun: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

function bearer(request: NextRequest): string | undefined {
  const [scheme, token] = (request.headers.get("authorization") ?? "").split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

export async function POST(request: NextRequest) {
  const token = process.env.PANDORA_INTERNAL_JOB_TOKEN;
  if (!token || bearer(request) !== token) {
    return NextResponse.json({ ok: false, blockers: ["internal_job_token_required"] }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, blockers: ["invalid_request"], issues: parsed.error.flatten() }, { status: 400 });
  }
  // Safe-by-default: any run without an explicit dryRun:false stays a non-destructive dry run.
  const dryRun = parsed.data.dryRun ?? parsed.data.dry_run ?? true;
  // Server-derived identity only — never trust a client-supplied user id for memory writes.
  const user_id = process.env.PANDORA_MEMORY_BRIDGE_USER_ID;
  if (!user_id) {
    return NextResponse.json({ ok: false, blockers: ["job_user_id_required"], next_step: "Configure PANDORA_MEMORY_BRIDGE_USER_ID (server-derived identity)." }, { status: 400 });
  }
  let client;
  try {
    client = createSupabaseBridgeAdminClient();
  } catch {
    return NextResponse.json({ ok: false, blockers: ["memory_backend_unavailable"], next_step: "Configure the Supabase bridge environment before running maintenance." }, { status: 503 });
  }
  const result = await runPhase5dMaintenance(client as never, { user_id, namespace: parsed.data.namespace, dry_run: dryRun });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
