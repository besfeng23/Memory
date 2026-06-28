import { NextResponse } from "next/server";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { PHASE5C_SAFE_PRODUCTION, PANDORA_VERCEL_PROJECT } from "@/lib/services/env-broker-service";
import { pushVercelEnv } from "@/lib/services/vercel-env-provider";
import { recordEnvAuditEvent } from "@/lib/services/env-audit-service";
export async function POST() { const guard = await requireEnvAdmin(); if (guard.response) return guard.response; const results = []; for (const [key, value] of Object.entries(PHASE5C_SAFE_PRODUCTION)) results.push({ key, result: await pushVercelEnv({ projectId: PANDORA_VERCEL_PROJECT.providerProjectId, teamId: PANDORA_VERCEL_PROJECT.providerTeamId, key, value, type: "plain" }) }); recordEnvAuditEvent({ action: "env.vercel.push_safe_defaults", actorUserId: guard.user?.id, metadata: { keys: Object.keys(PHASE5C_SAFE_PRODUCTION) } }); return NextResponse.json({ ok: results.every((r) => r.result.ok), results }); }
