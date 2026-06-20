import { NextResponse, type NextRequest } from "next/server";
import { createRepositoryContext, type RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryReviewQueueRepository } from "@/lib/db/memory-review-queue-repository-contract";
import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";
import type { MemoryNamespace } from "@/lib/services/memory-extraction-contract";
import type { MemoryReviewStatus } from "@/lib/services/memory-review-queue-contract";

export type MemoryReviewAuthSession = { userId: string | null };
export type MemoryReviewRouteDependencies = { repository?: MemoryReviewQueueRepository; resolveSession: (request: NextRequest) => Promise<MemoryReviewAuthSession | null>; defaultNamespace?: MemoryNamespace; disabledReason?: string };
const safety = { status: "disabled_read_only", userIdSource: "server_auth_context_only", ignoresClientUserId: true, wouldPersist: false, wouldApprove: false } as const;
function hasClientUserId(url: URL) { return url.searchParams.has("user_id") || url.searchParams.has("userId"); }
function ns(v: string | null, d: MemoryNamespace): MemoryNamespace { return v === "au" || v === "real_life" ? v : d; }
function limit(v: string | null) { const n = Number(v ?? 50); return Number.isFinite(n) ? Math.max(1, Math.min(n, 100)) : 50; }
function dtoFromItem(item: MemoryReviewQueueItem) { return { id: item.id, status: item.status, namespace: item.namespace, candidatePreview: item.normalizedText.slice(0, 160), evidenceSummary: item.evidence.hasEvidence ? `${item.evidence.spans.length} evidence span(s)` : "No evidence", sensitivityLevel: item.sensitivity.level, productionWriteDisabled: true, approvalActionsDisabled: true }; }
async function contextFor(request: NextRequest, deps: MemoryReviewRouteDependencies): Promise<{ response: Response } | { context: RepositoryContext }> {
  if (!deps.repository) return { response: NextResponse.json({ ok: false, ...safety, code: "not_implemented", message: deps.disabledReason ?? "Review repository is not configured." }, { status: 501 }) };
  const url = new URL(request.url); if (hasClientUserId(url)) return { response: NextResponse.json({ ok: false, ...safety, code: "client_user_id_rejected", message: "Client-supplied user_id is rejected." }, { status: 400 }) };
  const session = await deps.resolveSession(request); const ctx = createRepositoryContext({ userId: session?.userId, namespace: ns(url.searchParams.get("namespace"), deps.defaultNamespace ?? "real_life"), requestId: request.headers.get("x-request-id") ?? undefined });
  if (!ctx.ok) return { response: NextResponse.json({ ok: false, ...safety, code: ctx.error.code, message: ctx.error.message }, { status: 401 }) };
  return { context: ctx.data };
}
export function createMemoryReviewRouteHandler(deps: MemoryReviewRouteDependencies) {
  return {
    async list(request: NextRequest) { const c = await contextFor(request, deps); if ("response" in c) return c.response; const url = new URL(request.url); const status = url.searchParams.get("status") as MemoryReviewStatus | null; if (url.searchParams.get("counts") === "true") { const result = await deps.repository!.countReviewItemsByStatus(c.context); return NextResponse.json(result.ok ? { ok: true, ...safety, counts: result.data } : { ok: false, ...safety, code: result.error.code, message: result.error.message }, { status: result.ok ? 200 : 500 }); } const result = await deps.repository!.listReviewQueueItems(c.context, { status: status ?? undefined, limit: limit(url.searchParams.get("limit")) }); return NextResponse.json(result.ok ? { ok: true, ...safety, items: result.data.map(dtoFromItem) } : { ok: false, ...safety, code: result.error.code, message: result.error.message, items: [] }, { status: result.ok ? 200 : 500 }); },
    async detail(request: NextRequest, id: string) { const c = await contextFor(request, deps); if ("response" in c) return c.response; const result = await deps.repository!.readReviewQueueItemById(c.context, id); return NextResponse.json(result.ok ? { ok: true, ...safety, item: dtoFromItem(result.data) } : { ok: false, ...safety, code: result.error.code, message: result.error.message, item: null }, { status: result.ok ? 200 : 404 }); },
    async mutate(request: NextRequest) { await request.json().catch(() => null); return NextResponse.json({ ok: false, ...safety, code: "not_implemented", message: "Review approval, decisions, archive, and memory persistence are disabled on public routes." }, { status: 501 }); },
  };
}
