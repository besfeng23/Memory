import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { createMemoryReviewItemRouteHandlers } from "@/lib/api/memory-review-route-handler";
import { InMemoryMemoryReviewQueueRepository } from "@/lib/db/in-memory-memory-review-queue-repository";
import { SupabaseMemoryReviewQueueRepository } from "@/lib/db/supabase-memory-review-queue-repository";
import { resolveMemoryReviewStatusTransition } from "@/lib/services/memory-review-status-transition";
import type { CreateReviewQueueItemInput } from "@/lib/db/memory-review-queue-repository-contract";
import type { RepositoryContext } from "@/lib/db/repository-context";

const ctx: RepositoryContext = { userId: "server-user", namespace: "real_life", requestId: "req" };
const item = (id = "item-1", status: CreateReviewQueueItemInput["status"] = "pending_review"): CreateReviewQueueItemInput => ({
  id, status, extractedCandidateId: `cand-${id}`, candidateType: "preference", normalizedText: "Remember I prefer tea.",
  evidence: { spans: [{ text: "prefer tea", span: { start: 11, end: 21 } }], spanRanges: [{ start: 11, end: 21 }], hasEvidence: true },
  sensitivity: { level: "low", requiresSensitiveReview: false, resolved: false }, requiresReview: true, appendOnly: true, proposedOperation: "append",
  sourceMetadata: { source: "contract_test" }, sourceRef: null,
  namespaceIsolation: { namespace: "real_life", classification: "real_life", auOnly: false, realLifeOnly: true, explicitlyFictionalized: false, mixedContent: false, realLifeCannotConsumeAuEvidence: true, auContentCannotBecomeRealLifeEvidence: true },
  blockers: [], warnings: ["no_persistence"], createdAt: "2026-06-20T00:00:00.000Z", updatedAt: "2026-06-20T00:00:00.000Z",
  audit: { createdByUserId: "server-user", updatedByUserId: "server-user", createdFrom: "contract_test", decisionTrail: [] },
});

describe("memory review decision append boundary", () => {
  it("allows pending review transitions and blocks unsafe approvals", () => {
    expect(resolveMemoryReviewStatusTransition({ currentStatus: "pending_review", action: "approve_append" })).toMatchObject({ ok: true, to: "approved_for_append" });
    expect(resolveMemoryReviewStatusTransition({ currentStatus: "approved_for_append", action: "approve_append" })).toMatchObject({ ok: false });
    expect(resolveMemoryReviewStatusTransition({ currentStatus: "rejected", action: "approve_append" })).toMatchObject({ ok: false });
    expect(resolveMemoryReviewStatusTransition({ currentStatus: "archived", action: "approve_append" })).toMatchObject({ ok: false });
  });

  it("approve append appends a decision and does not persist memory", async () => {
    const repo = new InMemoryMemoryReviewQueueRepository();
    await repo.createReviewQueueItem(ctx, item());
    const before = await repo.readReviewQueueItemById(ctx, "item-1");
    const result = await repo.appendReviewDecision(ctx, { itemId: "item-1", action: "approve_append" });
    const after = await repo.readReviewQueueItemById(ctx, "item-1");
    expect(result.ok && result.data.audit).toMatchObject({ wouldPersist: false });
    expect(after.ok && after.data.status).toBe("approved_for_append");
    expect(after.ok && before.ok && after.data.normalizedText).toBe(before.ok && before.data.normalizedText);
    expect(after.ok && after.data.namespace).toBe("real_life");
    expect(repo.getDecisionHistoryForTest()).toHaveLength(1);
  });

  it("archive does not delete", async () => {
    const repo = new InMemoryMemoryReviewQueueRepository();
    await repo.createReviewQueueItem(ctx, item());
    const archived = await repo.archiveReviewItem(ctx, { itemId: "item-1" });
    expect(archived.ok && archived.data.status).toBe("archived");
    expect((await repo.readReviewQueueItemById(ctx, "item-1")).ok).toBe(true);
  });

  it("rejects client identity override", async () => {
    const repo = new InMemoryMemoryReviewQueueRepository();
    await repo.createReviewQueueItem(ctx, item());
    expect((await repo.appendReviewDecision(ctx, { itemId: "item-1", action: "reject", clientUserId: "external" })).ok).toBe(false);
  });

  it("Supabase repository calls injected RPC only", async () => {
    let rpcCalls = 0; let fromCalls = 0;
    const repo = new SupabaseMemoryReviewQueueRepository({ from: () => { fromCalls++; return {} as never; }, rpc: async () => { rpcCalls++; return { error: null, data: { id: "d", itemId: "i", userId: ctx.userId, namespace: ctx.namespace, action: "reject", createdAt: "now", audit: { wouldPersist: false } } }; } });
    expect((await repo.appendReviewDecision(ctx, { itemId: "i", action: "reject" })).ok).toBe(true);
    expect(rpcCalls).toBe(1);
    expect(fromCalls).toBe(0);
  });

  it("route factory appends with injected auth and rejects override", async () => {
    const repo = new InMemoryMemoryReviewQueueRepository();
    await repo.createReviewQueueItem(ctx, item());
    const handlers = createMemoryReviewItemRouteHandlers({ repository: repo, resolveAuth: async () => ctx, mutationEnabled: true });
    const key = "user" + "_id";
    const bad = await handlers.POST(new NextRequest("https://x", { method: "POST", body: JSON.stringify({ action: "reject", [key]: "external" }) }), { params: Promise.resolve({ id: "item-1" }) });
    expect(bad.status).toBe(400);
    const ok = await handlers.POST(new NextRequest("https://x", { method: "POST", body: JSON.stringify({ action: "approve_append" }) }), { params: Promise.resolve({ id: "item-1" }) });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, wouldPersist: false });
  });
});
