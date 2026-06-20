import { describe, expect, it } from "vitest";
import { InMemoryMemoryReviewQueueRepository } from "@/lib/db/in-memory-memory-review-queue-repository";
import { SupabaseMemoryReviewQueueRepository, memoryReviewQueueTableNames } from "@/lib/db/supabase-memory-review-queue-repository";
import type { CreateReviewQueueItemInput } from "@/lib/db/memory-review-queue-repository-contract";
import type { RepositoryContext } from "@/lib/db/repository-context";

const ctx: RepositoryContext = { userId: "server-user", namespace: "real_life", requestId: "req" };
const item = (id = "item-1"): CreateReviewQueueItemInput => ({
  id, status: "pending_review", extractedCandidateId: `cand-${id}`, candidateType: "preference", normalizedText: "Remember I prefer tea.",
  evidence: { spans: [{ text: "prefer tea", span: { start: 11, end: 21 } }], spanRanges: [{ start: 11, end: 21 }], hasEvidence: true },
  sensitivity: { level: "low", requiresSensitiveReview: false, resolved: false }, requiresReview: true, appendOnly: true, proposedOperation: "append",
  sourceMetadata: { source: "contract_test" }, sourceRef: null,
  namespaceIsolation: { namespace: "real_life", classification: "real_life", auOnly: false, realLifeOnly: true, explicitlyFictionalized: false, mixedContent: false, realLifeCannotConsumeAuEvidence: true, auContentCannotBecomeRealLifeEvidence: true },
  blockers: [], warnings: ["no_persistence"], createdAt: "2026-06-20T00:00:00.000Z", updatedAt: "2026-06-20T00:00:00.000Z",
  audit: { createdByUserId: "server-user", updatedByUserId: "server-user", createdFrom: "contract_test", decisionTrail: [] },
});

describe("memory review queue repositories", () => {
  it("creates, lists, and reads only by context-derived user and namespace", async () => {
    const repo = new InMemoryMemoryReviewQueueRepository();
    expect((await repo.createReviewQueueItem(ctx, item())).ok).toBe(true);
    expect((await repo.listReviewQueueItems(ctx)).ok && (await repo.listReviewQueueItems(ctx)).data).toHaveLength(1);
    expect((await repo.readReviewQueueItemById({ ...ctx, userId: "other" }, "item-1")).ok).toBe(false);
    expect((await repo.readReviewQueueItemById({ ...ctx, namespace: "au" }, "item-1")).ok).toBe(false);
  });

  it("rejects namespace override and duplicate candidate mutation", async () => {
    const repo = new InMemoryMemoryReviewQueueRepository();
    expect((await repo.createReviewQueueItem(ctx, { ...item(), namespace: "au" })).ok).toBe(false);
    expect((await repo.createReviewQueueItem(ctx, item())).ok).toBe(true);
    expect((await repo.createReviewQueueItem(ctx, { ...item(), normalizedText: "silent overwrite" })).ok).toBe(false);
  });

  it("appends decision history and archive does not delete", async () => {
    const repo = new InMemoryMemoryReviewQueueRepository();
    await repo.createReviewQueueItem(ctx, item());
    expect((await repo.appendReviewDecision(ctx, { itemId: "item-1", action: "reject", reason: "no" })).ok).toBe(true);
    expect((await repo.appendReviewDecision(ctx, { itemId: "item-1", action: "approve_append", client_user_id: "attacker" })).ok).toBe(false);
    const archived = await repo.archiveReviewItem(ctx, { itemId: "item-1" });
    expect(archived.ok && archived.data.status).toBe("archived");
    expect((await repo.readReviewQueueItemById(ctx, "item-1")).ok).toBe(true);
    expect(repo.getDecisionHistoryForTest()).toHaveLength(2);
  });

  it("supports status counts and filters", async () => {
    const repo = new InMemoryMemoryReviewQueueRepository();
    await repo.createManyReviewQueueItems(ctx, [item("a"), { ...item("b"), status: "needs_clarification" }]);
    const filtered = await repo.listReviewQueueItems(ctx, { status: "needs_clarification" });
    const counts = await repo.countReviewItemsByStatus(ctx);
    expect(filtered.ok && filtered.data).toHaveLength(1);
    expect(counts.ok && counts.data).toEqual(expect.arrayContaining([{ status: "pending_review", count: 1 }, { status: "needs_clarification", count: 1 }]));
  });

  it("Supabase skeleton uses injection and returns safe not implemented errors", async () => {
    let fromCalls = 0;
    const repo = new SupabaseMemoryReviewQueueRepository({ from: () => { fromCalls += 1; return {}; } });
    const result = await repo.listReviewQueueItems(ctx);
    expect(memoryReviewQueueTableNames.items).toBe("memory_review_queue_items");
    expect(result.ok).toBe(false);
    expect(fromCalls).toBe(1);
  });
});
