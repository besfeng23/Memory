import { NextResponse } from "next/server";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { PANDORA_VERCEL_PROJECT, generateManagedSecret } from "@/lib/services/env-broker-service";
import { pushVercelEnv } from "@/lib/services/vercel-env-provider";
import { recordEnvAuditEvent } from "@/lib/services/env-audit-service";
export async function POST(request: Request) { const guard = await requireEnvAdmin(); if (guard.response) return guard.response; const { key } = await request.json().catch(() => ({})); if (key !== "PANDORA_INTERNAL_JOB_TOKEN") return NextResponse.json({ ok: false, error: { code: "unsupported_key" } }, { status: 400 }); const generated = generateManagedSecret(key); const pushed = await pushVercelEnv({ projectId: PANDORA_VERCEL_PROJECT.providerProjectId, teamId: PANDORA_VERCEL_PROJECT.providerTeamId, key, value: generated.value }); recordEnvAuditEvent({ action: "env.vercel.push", actorUserId: guard.user?.id, key, metadata: { result: pushed.ok ? "ok" : pushed.code, fingerprint: generated.fingerprint } }); return NextResponse.json({ ok: pushed.ok, key, fingerprint: generated.fingerprint, provider: pushed, rawReturned: false }); }
