import { NextResponse } from "next/server";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { buildEnvDriftReport } from "@/lib/services/env-drift-service";

export async function POST() {
  const guard = await requireEnvAdmin(false);
  if (guard.response) return guard.response;
  if (process.env.PANDORA_ENV_BROKER_ENABLED !== "true") return NextResponse.json({ ok: false, error: { code: "broker_disabled", message: "Pandora Env Broker gate is required for drift checks." } }, { status: 403 });
  return NextResponse.json(await buildEnvDriftReport());
}
