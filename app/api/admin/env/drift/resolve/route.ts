import { NextRequest, NextResponse } from "next/server";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { buildEnvDriftReport, generateMissingGeneratedSecrets, pushRequiredSafeDefaults } from "@/lib/services/env-drift-service";

export async function POST(request: NextRequest) {
  const guard = await requireEnvAdmin(true);
  if (guard.response) return guard.response;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");
  if (confirmation !== "RESOLVE ENV DRIFT") return NextResponse.json({ ok: false, error: { code: "confirmation_required" } }, { status: 400 });
  if (action === "push-safe-defaults") return NextResponse.json({ ok: true, action, results: await pushRequiredSafeDefaults(), redeployRequired: true });
  if (action === "generate-missing-secrets") return NextResponse.json({ ok: true, action, results: await generateMissingGeneratedSecrets(await buildEnvDriftReport()), redeployRequired: true });
  if (action === "acknowledge-unmanaged") return NextResponse.json({ ok: true, action, acknowledged: (await buildEnvDriftReport()).unmanagedProviderEnvs });
  return NextResponse.json({ ok: false, error: { code: "unsupported_action" } }, { status: 400 });
}
