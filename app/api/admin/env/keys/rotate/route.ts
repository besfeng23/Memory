import { NextResponse } from "next/server";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { PANDORA_VERCEL_PROJECT, generateManagedSecret } from "@/lib/services/env-broker-service";
import { pushVercelEnv } from "@/lib/services/vercel-env-provider";
import { recordEnvAuditEvent } from "@/lib/services/env-audit-service";

export async function POST(request: Request) {
  const guard = await requireEnvAdmin();
  if (guard.response) return guard.response;
  const body = await readBody(request);
  const key = String(body.key ?? "PANDORA_INTERNAL_JOB_TOKEN");
  const expected = `ROTATE ${key}`;
  if (key !== "PANDORA_INTERNAL_JOB_TOKEN") return NextResponse.json({ ok: false, error: { code: "unsupported_key" } }, { status: 400 });
  if (String(body.confirmation ?? "") !== expected) return NextResponse.json({ ok: false, error: { code: "rotation_confirmation_required", expected } }, { status: 400 });
  const generated = generateManagedSecret(key);
  const pushed = await pushVercelEnv({ projectId: PANDORA_VERCEL_PROJECT.providerProjectId, teamId: PANDORA_VERCEL_PROJECT.providerTeamId, key, value: generated.value, target: ["production"], type: "plain" });
  const audit = await recordEnvAuditEvent({ action: "env.vercel.rotate_and_push", actorUserId: guard.user?.id, key, metadata: { result: pushed.ok ? "ok" : pushed.code, fingerprint: generated.fingerprint, target: ["production"], redeployRequired: pushed.ok ? pushed.redeployRequired : undefined } });
  return NextResponse.json({ ok: pushed.ok, key, fingerprint: generated.fingerprint, provider: pushed, audit: { durable: audit.durable, code: audit.durabilityCode }, rawReturned: false, nextStep: pushed.ok ? "redeploy_required_before_authenticated_smoke_test" : "fix_provider_blocker" }, { status: pushed.ok ? 200 : 502 });
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return request.json().catch(() => ({}));
  if (type.includes("form")) return Object.fromEntries((await request.formData()).entries());
  return {};
}
