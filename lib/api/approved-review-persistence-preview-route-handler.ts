import { NextResponse, type NextRequest } from "next/server";
import { createRepositoryContext, type RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryReviewQueueRepository } from "@/lib/db/memory-review-queue-repository-contract";
import type { MemoryNamespace } from "@/lib/services/memory-extraction-contract";
import { previewApprovedReviewMemoryPersistence } from "@/lib/services/approved-review-memory-persistence-preview";

export type ApprovedReviewPersistencePreviewRouteDependencies = { repository?: MemoryReviewQueueRepository; resolveAuth?: (request: NextRequest) => Promise<Pick<RepositoryContext, "userId"> | null>; defaultNamespace?: MemoryNamespace; enabled?: boolean };
const disabled = { ok: false, status: "disabled", wouldPersist: false, productionWriteDisabled: true, requiresFutureInternalGate: true, message: "Approved review memory persistence preview is disabled until authenticated internal dependencies are injected." } as const;
function hasClientUserId(url: URL, body?: Record<string, unknown>) { return url.searchParams.has("user_id") || url.searchParams.has("userId") || Boolean(body?.user_id || body?.userId || body?.client_user_id || body?.clientUserId); }
export function createApprovedReviewPersistencePreviewRouteHandler(deps: ApprovedReviewPersistencePreviewRouteDependencies = {}) {
  return async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const url = new URL(request.url);
    if (hasClientUserId(url, body)) return NextResponse.json({ ...disabled, status: "client_user_id_rejected", message: "Client-supplied user_id/userId is rejected." }, { status: 400 });
    if (!deps.enabled || !deps.repository || !deps.resolveAuth) return NextResponse.json(disabled, { status: 501 });
    const auth = await deps.resolveAuth(request); const ctx = createRepositoryContext({ userId: auth?.userId ?? null, namespace: deps.defaultNamespace ?? "real_life", requestId: request.headers.get("x-request-id") ?? undefined });
    if (!ctx.ok) return NextResponse.json({ ...disabled, status: ctx.error.code, message: ctx.error.message }, { status: 401 });
    const { id } = await params; const item = await deps.repository.readReviewQueueItemById(ctx.data, id);
    if (!item.ok) return NextResponse.json({ ...disabled, status: item.error.code, message: item.error.message }, { status: item.error.code === "not_found" ? 404 : 400 });
    const preview = previewApprovedReviewMemoryPersistence({ context: ctx.data, items: [item.data] });
    return NextResponse.json({ ...preview, ok: true, status: "preview_only", summary: preview.summary }, { status: 200 });
  };
}
