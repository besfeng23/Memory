import { NextResponse } from "next/server";
import { generateManagedSecret } from "@/lib/services/env-broker-service";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { recordEnvAuditEvent } from "@/lib/services/env-audit-service";
export async function POST(request: Request) { const guard = await requireEnvAdmin(); if (guard.response) return guard.response; const { key = "PANDORA_INTERNAL_JOB_TOKEN" } = await request.json().catch(() => ({})); const generated = generateManagedSecret(key); recordEnvAuditEvent({ action: "env.key.generate", actorUserId: guard.user?.id, key, metadata: { fingerprint: generated.fingerprint } }); return NextResponse.json({ ok: true, key, fingerprint: generated.fingerprint, rawReturned: false }); }
