import { NextResponse } from "next/server";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { runPhase5cSmokeTest } from "@/lib/services/phase5c-smoke-test-service";
import { recordEnvAuditEvent } from "@/lib/services/env-audit-service";

export async function POST(request: Request) {
  const guard = await requireEnvAdmin();
  if (guard.response) return guard.response;

  const body = await readBody(request);
  const baseUrl = String(body.baseUrl ?? process.env.NEXTAUTH_URL ?? "https://pandorasmemory.vercel.app");
  const result = await runPhase5cSmokeTest(baseUrl, process.env.PANDORA_INTERNAL_JOB_TOKEN);
  const audit = await recordEnvAuditEvent({
    action: "env.smoke.phase5c",
    actorUserId: guard.user?.id,
    metadata: { baseUrl, ok: result.ok, authenticatedDryRunVerified: result.authenticatedDryRunVerified, blockers: result.blockers, warnings: result.warnings },
  });

  return NextResponse.json({ ...result, audit: { durable: audit.durable, code: audit.durabilityCode }, rawTokenReturned: false });
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return request.json().catch(() => ({}));
  if (type.includes("form")) return Object.fromEntries((await request.formData()).entries());
  return {};
}
