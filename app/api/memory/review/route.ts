import { NextResponse, type NextRequest } from "next/server";
import { createMemoryReviewRouteHandler } from "@/lib/api/memory-review-route-handler";
export const dynamic = "force-dynamic";
const handler = createMemoryReviewRouteHandler({ resolveSession: async () => null, disabledReason: "Authenticated review repository wiring is disabled in production defaults." });
export async function GET(request: NextRequest) { return handler.list(request); }
export async function POST(request: NextRequest) { return handler.mutate(request); }
export async function PUT() { return NextResponse.json({ ok: false, wouldApprove: false, wouldPersist: false, message: "Review mutations are disabled." }, { status: 501 }); }
