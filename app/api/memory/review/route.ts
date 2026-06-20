import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export type MemoryReviewQueueItemDto = {
  id: string;
  status: "pending_review" | "needs_clarification" | "blocked" | "approved_for_append" | "rejected" | "archived";
  namespace: "real_life" | "au";
  candidatePreview: string;
  evidenceSummary: string;
  sensitivityLevel: "low" | "medium" | "high" | "restricted";
  productionWriteDisabled: true;
};

const disabledBody = {
  ok: false,
  status: "disabled_read_only_stub",
  code: "not_implemented",
  message: "Review queue API is read-only/disabled until authenticated RLS-safe repository wiring is implemented.",
  userIdSource: "server_auth_context_only",
  ignoresClientUserId: true,
  wouldPersist: false,
  wouldApprove: false,
  items: [] as MemoryReviewQueueItemDto[],
};

export async function GET() {
  return NextResponse.json(disabledBody, { status: 501 });
}

export async function POST(request: NextRequest) {
  await request.json().catch(() => null);
  return NextResponse.json({ ...disabledBody, message: "Review queue decisions are disabled; public routes cannot approve or persist memory." }, { status: 501 });
}
