import { type NextRequest } from "next/server";
import { createMemoryReviewRouteHandler } from "@/lib/api/memory-review-route-handler";
export const dynamic = "force-dynamic";
const handler = createMemoryReviewRouteHandler({ resolveSession: async () => null, disabledReason: "Authenticated review repository wiring is disabled in production defaults." });
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return handler.detail(request, (await params).id); }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return handler.mutate(request, (await params).id); }
