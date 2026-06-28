import { NextResponse } from "next/server";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { PANDORA_VERCEL_PROJECT, generateManagedSecret } from "@/lib/services/env-broker-service";
import { pushVercelEnv } from "@/lib/services/vercel-env-provider";
import { recordEnvAuditEvent } from "@/lib/services/env-audit-service";

export async function POST(request: Request) {
  const guard = await requireEnvAdmin();
  if (guard.response) return guard.response;

  const body = await parseBody(request);
  const key = String(body.key ?? "PANDORA_INTERNAL_JOB_TOKEN");
  if (key !== "PANDORA_INTERNAL_JOB_TOKEN") return NextResponse.json({ ok: false, error: { code: "unsupported_key" } }, { status: 400 });

  const generated = generateManagedSecret(key);
  const pushed = await pushVercelEnv({
    projectId: PANDORA_VERCEL_PROJECT.providerProjectId,
    teamId: PANDORA_VERCEL_PROJECT.providerTeamId,
    key,
    value: generated.value,
    target: ["production"],
    type: "plain",
    comment: "Managed by Pandora Env Broker: generated-and-pushed operator job token",
  });

  const audit = await recordEnvAuditEvent({
    action: "env.vercel.generate_and_push",
    actorUserId: guard.user?.id,
    key,
    metadata: { result: pushed.ok ? "ok" : pushed.code, fingerprint: generated.fingerprint, target: ["production"], redeployRequired: pushed.ok ? pushed.redeployRequired : undefined },
  });

  return NextResponse.json({
    ok: pushed.ok,
    key,
    fingerprint: generated.fingerprint,
    provider: pushed,
    audit: { durable: audit.durable, code: audit.durabilityCode },
    rawReturned: false,
    nextStep: pushed.ok ? "redeploy_required_before_authenticated_smoke_test" : "fix_provider_blocker",
  }, { status: pushed.ok ? 200 : 502 });
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return request.json().catch(() => ({}));
  if (contentType.includes("form")) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }
  return {};
}
