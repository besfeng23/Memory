import { NextResponse } from "next/server";
import { getEnvBrokerStatus } from "@/lib/services/env-broker-service";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
export async function GET() { const guard = await requireEnvAdmin(false); if (guard.response) return guard.response; return NextResponse.json(getEnvBrokerStatus()); }
