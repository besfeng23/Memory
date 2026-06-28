import { NextRequest, NextResponse } from "next/server";
import { buildEnvDriftReport } from "@/lib/services/env-drift-service";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-pandora-internal-token");
  if (process.env.PANDORA_INTERNAL_JOB_TOKEN && token === process.env.PANDORA_INTERNAL_JOB_TOKEN) return NextResponse.json(await buildEnvDriftReport());
  const guard = await requireEnvAdmin(false);
  if (guard.response) return guard.response;
  return NextResponse.json(await buildEnvDriftReport());
}
