import { NextResponse } from "next/server";
import { discoverEnvKeys } from "@/lib/services/env-discovery-service";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { recordEnvAuditEvent } from "@/lib/services/env-audit-service";
export async function POST() { const guard = await requireEnvAdmin(); if (guard.response) return guard.response; const discovered = discoverEnvKeys(); recordEnvAuditEvent({ action: "env.discover", actorUserId: guard.user?.id, metadata: { count: discovered.length } }); return NextResponse.json({ ok: true, discovered }); }
