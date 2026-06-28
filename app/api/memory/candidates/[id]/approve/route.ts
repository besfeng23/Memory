import { NextRequest, NextResponse } from "next/server";
import { namespace, withBridge } from "@/app/api/memory/adaptive/route-helper";
import { approveCandidateForReview } from "@/lib/services/memory-candidate-service";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ ok: false, blockers: ["invalid_candidate_id"] }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const ns = namespace(body.namespace);
  if (!ns) return NextResponse.json({ ok: false, blockers: ["namespace_required"] }, { status: 400 });
  const bridge = await withBridge(request, "memoryCaptureApiEnabled");
  if ("error" in bridge) return bridge.error;
  const result = await approveCandidateForReview(bridge.client, { id, userId: bridge.principal.userId, namespace: ns, review_note: body.review_note });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
