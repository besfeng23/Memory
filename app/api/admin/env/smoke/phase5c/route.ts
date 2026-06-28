import { NextResponse } from "next/server";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { runPhase5cSmokeTest } from "@/lib/services/phase5c-smoke-test-service";
export async function POST(request: Request) { const guard = await requireEnvAdmin(); if (guard.response) return guard.response; const { baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000" } = await request.json().catch(() => ({})); const result = await runPhase5cSmokeTest(baseUrl); return NextResponse.json(result); }
