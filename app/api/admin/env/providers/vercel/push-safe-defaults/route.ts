import { NextResponse } from "next/server";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { PHASE5C_SAFE_PRODUCTION, PANDORA_VERCEL_PROJECT } from "@/lib/services/env-broker-service";
import { pushVercelEnv } from "@/lib/services/vercel-env-provider";
import { recordEnvAuditEvent } from "@/lib/services/env-audit-service";

export async function POST(request: Request) {
  const guard = await requireEnvAdmin();
  if (guard.response) return guard.response;

  const body = await readBody(request);
  if (String(body.confirmation ?? "") !== "PUSH SAFE DEFAULTS") return NextResponse.json({ ok: false, error: { code: "push_confirmation_required", expected: "PUSH SAFE DEFAULTS" } }, { status: 400 });

  const results = [];
  for (const [key, value] of Object.entries(PHASE5C_SAFE_PRODUCTION)) {
    results.push({ key, result: await pushVercelEnv({ projectId: PANDORA_VERCEL_PROJECT.providerProjectId, teamId: PANDORA_VERCEL_PROJECT.providerTeamId, key, value, target: ["production"], type: "plain" }) });
  }
  const audit = await recordEnvAuditEvent({ action: "env.vercel.push_safe_defaults", actorUserId: guard.user?.id, metadata: { keys: Object.keys(PHASE5C_SAFE_PRODUCTION), target: ["production"] } });
  return NextResponse.json({ ok: results.every((r) => r.result.ok), results, audit: { durable: audit.durable, code: audit.durabilityCode }, redeployRequired: results.some((r) => r.result.ok && r.result.redeployRequired) });
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return request.json().catch(() => ({}));
  if (type.includes("form")) return Object.fromEntries((await request.formData()).entries());
  return {};
}
