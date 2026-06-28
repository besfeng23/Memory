import { NextResponse } from "next/server";
import { generateManagedSecret } from "@/lib/services/env-broker-service";
import { requireEnvAdmin } from "@/lib/services/env-admin-route-guard";
import { recordEnvAuditEvent } from "@/lib/services/env-audit-service";

export async function POST(request: Request) {
  const guard = await requireEnvAdmin();
  if (guard.response) return guard.response;

  const { key = "PANDORA_INTERNAL_JOB_TOKEN" } = await request.json().catch(() => ({}));
  const generated = generateManagedSecret(String(key));
  const audit = await recordEnvAuditEvent({
    action: "env.key.generate_discarded",
    actorUserId: guard.user?.id,
    key: String(key),
    metadata: { fingerprint: generated.fingerprint, rawSecretRetained: false, operationallyPushed: false },
  });

  return NextResponse.json({
    ok: true,
    key,
    fingerprint: generated.fingerprint,
    rawReturned: false,
    rawSecretRetained: false,
    operationallyPushed: false,
    audit: { durable: audit.durable, code: audit.durabilityCode },
    nextStep: "Use /api/admin/env/providers/vercel/push for atomic generate-and-push.",
  });
}
