import { NextResponse, type NextRequest } from "next/server";
import { createRepositoryContext, type RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryReviewQueueRepository, ReviewQueueDecisionRecord } from "@/lib/db/memory-review-queue-repository-contract";
import type { MemoryReviewAction, MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";
import type { MemoryNamespace } from "@/lib/services/memory-extraction-contract";
import type { MemoryReviewStatus } from "@/lib/services/memory-review-queue-contract";
import { validateMemoryReviewDecision } from "@/lib/services/memory-review-decision-validator";
import { resolveMemoryReviewStatusTransition } from "@/lib/services/memory-review-status-transition";

export type MemoryReviewAuthSession = { userId: string | null };
export type MemoryReviewRouteDependencies = {
  repository?: MemoryReviewQueueRepository;
  resolveSession: (request: NextRequest) => Promise<MemoryReviewAuthSession | null>;
  defaultNamespace?: MemoryNamespace;
  disabledReason?: string;
  mutationEnabled?: boolean;
};
export type MemoryReviewAuthResolver = (request: NextRequest) => Promise<RepositoryContext | null>;
export type MemoryReviewRouteFactoryOptions = { repository: MemoryReviewQueueRepository; resolveAuth: MemoryReviewAuthResolver; mutationEnabled?: boolean };

const safety = { status: "disabled_read_only", userIdSource: "server_auth_context_only", ignoresClientUserId: true, wouldPersist: false, wouldApprove: false } as const;
const actions: MemoryReviewAction[] = ["approve_append", "reject", "request_clarification", "mark_sensitive", "mark_namespace_mismatch", "archive"];
function hasClientUserId(url: URL) { return url.searchParams.has("user_id") || url.searchParams.has("userId"); }
function hasClientUserIdBody(body: Record<string, unknown>) { return Boolean(body.user_id || body.userId || body.client_user_id || body.clientUserId); }
function ns(v: string | null, d: MemoryNamespace): MemoryNamespace { return v === "au" || v === "real_life" ? v : d; }
function limit(v: string | null) { const n = Number(v ?? 50); return Number.isFinite(n) ? Math.max(1, Math.min(n, 100)) : 50; }
function dtoFromItem(item: MemoryReviewQueueItem) { return { id: item.id, status: item.status, namespace: item.namespace, candidatePreview: item.normalizedText.slice(0, 160), evidenceSummary: item.evidence.hasEvidence ? `${item.evidence.spans.length} evidence span(s)` : "No evidence", sensitivityLevel: item.sensitivity.level, productionWriteDisabled: true, approvalActionsDisabled: true }; }
export function reviewDecisionDto(input: ReviewQueueDecisionRecord) { return { ...input, wouldPersist: false as const, approvalPersistsMemory: false as const, productionMemoryWritesDisabled: true as const }; }
async function disabledMutationResponse(request: NextRequest) { await request.json().catch(() => null); return NextResponse.json({ ok: false, ...safety, code: "not_implemented", message: "Review approval, decisions, archive, and memory persistence are disabled on public routes." }, { status: 501 }); }
async function contextFor(request: NextRequest, deps: MemoryReviewRouteDependencies): Promise<{ response: Response } | { context: RepositoryContext }> {
  if (!deps.repository) return { response: NextResponse.json({ ok: false, ...safety, code: "not_implemented", message: deps.disabledReason ?? "Review repository is not configured." }, { status: 501 }) };
  const url = new URL(request.url); if (hasClientUserId(url)) return { response: NextResponse.json({ ok: false, ...safety, code: "client_user_id_rejected", message: "Client-supplied user_id is rejected." }, { status: 400 }) };
  const session = await deps.resolveSession(request); const ctx = createRepositoryContext({ userId: session?.userId, namespace: ns(url.searchParams.get("namespace"), deps.defaultNamespace ?? "real_life"), requestId: request.headers.get("x-request-id") ?? undefined });
  if (!ctx.ok) return { response: NextResponse.json({ ok: false, ...safety, code: ctx.error.code, message: ctx.error.message }, { status: 401 }) };
  return { context: ctx.data };
}
async function mutateReviewDecision(request: NextRequest, id: string, deps: MemoryReviewRouteDependencies) {
  if (!deps.mutationEnabled) return disabledMutationResponse(request);
  const c = await contextFor(request, deps); if ("response" in c) return c.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (hasClientUserIdBody(body)) return NextResponse.json({ ok: false, ...safety, code: "client_user_id_override_attempt", message: "Client-supplied user_id is rejected." }, { status: 400 });
  const action = body.action as MemoryReviewAction;
  if (!actions.includes(action)) return NextResponse.json({ ok: false, ...safety, code: "validation_failed", message: "Invalid review action." }, { status: 400 });
  const item = await deps.repository!.readReviewQueueItemById(c.context, id);
  if (!item.ok) return NextResponse.json({ ok: false, ...safety, code: item.error.code, message: item.error.message }, { status: item.error.code === "not_found" ? 404 : 400 });
  const decision = { action, reason: typeof body.reason === "string" ? body.reason : undefined };
  const validation = validateMemoryReviewDecision({ item: item.data, reviewer: c.context, decision });
  const transition = resolveMemoryReviewStatusTransition({ currentStatus: item.data.status, action });
  const blockers = [...validation.blockers, ...(transition.ok ? [] : transition.blockers)];
  if (!validation.ok || !transition.ok) return NextResponse.json({ ok: false, ...safety, blockers }, { status: 409 });
  const appended = await deps.repository!.appendReviewDecision(c.context, { itemId: id, action, reason: decision.reason });
  if (!appended.ok) return NextResponse.json({ ok: false, ...safety, code: appended.error.code, message: appended.error.message }, { status: 400 });
  return NextResponse.json({ ok: true, status: "review_decision_appended", decision: reviewDecisionDto(appended.data), itemStatus: transition.to, wouldPersist: false, approvalPersistsMemory: false });
}
export function createMemoryReviewRouteHandler(deps: MemoryReviewRouteDependencies) {
  return {
    async list(request: NextRequest) { const c = await contextFor(request, deps); if ("response" in c) return c.response; const url = new URL(request.url); const status = url.searchParams.get("status") as MemoryReviewStatus | null; if (url.searchParams.get("counts") === "true") { const result = await deps.repository!.countReviewItemsByStatus(c.context); return NextResponse.json(result.ok ? { ok: true, ...safety, counts: result.data } : { ok: false, ...safety, code: result.error.code, message: result.error.message }, { status: result.ok ? 200 : 500 }); } const result = await deps.repository!.listReviewQueueItems(c.context, { status: status ?? undefined, limit: limit(url.searchParams.get("limit")) }); return NextResponse.json(result.ok ? { ok: true, ...safety, items: result.data.map(dtoFromItem) } : { ok: false, ...safety, code: result.error.code, message: result.error.message, items: [] }, { status: result.ok ? 200 : 500 }); },
    async detail(request: NextRequest, id: string) { const c = await contextFor(request, deps); if ("response" in c) return c.response; const result = await deps.repository!.readReviewQueueItemById(c.context, id); return NextResponse.json(result.ok ? { ok: true, ...safety, item: dtoFromItem(result.data) } : { ok: false, ...safety, code: result.error.code, message: result.error.message, item: null }, { status: result.ok ? 200 : 404 }); },
    async mutate(request: NextRequest, id?: string) { if (!deps.mutationEnabled) return disabledMutationResponse(request); if (!id) return NextResponse.json({ ok: false, ...safety, code: "missing_review_item_id" }, { status: 400 }); return mutateReviewDecision(request, id, deps); },
  };
}
export function createMemoryReviewItemRouteHandlers(options?: MemoryReviewRouteFactoryOptions) {
  const deps: MemoryReviewRouteDependencies = options ? { repository: options.repository, resolveSession: async (request) => { const ctx = await options.resolveAuth(request); return { userId: ctx?.userId ?? null }; }, defaultNamespace: "real_life", mutationEnabled: options.mutationEnabled, disabledReason: "Review decision mutation is disabled." } : { resolveSession: async () => null, disabledReason: "Review decision mutation is disabled." };
  const handler = createMemoryReviewRouteHandler(deps);
  return { POST: (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => params.then(({ id }) => handler.mutate(request, id)) };
}
