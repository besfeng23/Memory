import { NextResponse } from "next/server";
import { buildEnvCatalog } from "@/lib/services/env-broker-service";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { recordEnvAuditEvent } from "@/lib/services/env-audit-service";
export async function POST() { const guard = await requireEnvAdmin(); if (guard.response) return guard.response; const catalog = buildEnvCatalog(); recordEnvAuditEvent({ action: "env.catalog.sync", actorUserId: guard.user?.id, metadata: { count: catalog.length } }); return NextResponse.json({ ok: true, catalog }); }
