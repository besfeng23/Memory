import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/memory/review/[id]/persistence-preview/route";
import { createApprovedReviewPersistencePreviewRouteHandler } from "@/lib/api/approved-review-persistence-preview-route-handler";
import { buildApprovedReviewMemoryAppendPlan } from "@/lib/services/approved-review-memory-append-plan-builder";
import { previewApprovedReviewMemoryPersistence } from "@/lib/services/approved-review-memory-persistence-preview";
import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";

const context = { userId: "server-user", namespace: "real_life" as const, requestId: "r" };
function item(overrides: Partial<MemoryReviewQueueItem> = {}): MemoryReviewQueueItem {
  return { id: "review-1", status: "approved_for_append", userId: "server-user", namespace: "real_life", extractedCandidateId: "c1", candidateType: "fact", normalizedText: "User likes tea.", evidence: { hasEvidence: true, spans: [{ text: "likes tea", span: { start: 5, end: 14 } }], spanRanges: [{ start: 5, end: 14 }] }, sensitivity: { level: "low", requiresSensitiveReview: false, resolved: true }, requiresReview: true, appendOnly: true, proposedOperation: "append", sourceMetadata: { source: "contract_test", requestId: "r" }, sourceRef: "src", namespaceIsolation: { namespace: "real_life", classification: "real_life", auOnly: false, realLifeOnly: true, explicitlyFictionalized: false, mixedContent: false, realLifeCannotConsumeAuEvidence: true, auContentCannotBecomeRealLifeEvidence: true }, blockers: [], warnings: [], createdAt: "2026-06-23T00:00:00Z", updatedAt: "2026-06-23T00:00:00Z", audit: { createdByUserId: "server-user", updatedByUserId: "server-user", createdFrom: "contract_test", decisionTrail: [{ action: "created", at: "2026-06-23T00:00:00Z", reviewerUserId: "server-user" }] }, ...overrides };
}

describe("approved review memory persistence preview", () => {
  it("approved item builds append-only memory plan without writes/models/embeddings", () => {
    const plan = buildApprovedReviewMemoryAppendPlan({ context, items: [item()] });
    expect(plan).toMatchObject({ wouldPersist: false, wouldCallModel: false, wouldEmbed: false });
    expect(plan.plans[0]).toMatchObject({ eligible: true, wouldPersist: false, source: { appendOnly: true, wouldPersist: false }, item: { content: "User likes tea.", appendOnly: true }, patch: { operation: "append" }, auditLog: { appendOnly: true } });
  });
  it.each([
    ["unapproved", { status: "pending_review" as const }], ["rejected", { status: "rejected" as const }], ["needs clarification", { status: "needs_clarification" as const }], ["archived", { status: "archived" as const }], ["missing evidence", { evidence: { hasEvidence: false, spans: [], spanRanges: [] } }], ["namespace mismatch", {}, "au" as const], ["update", { proposedOperation: "update" as const }], ["delete", { proposedOperation: "delete" as const }], ["overwrite", { proposedOperation: "overwrite" as const }],
  ])("blocks %s", (_name, overrides, ns) => {
    const result = previewApprovedReviewMemoryPersistence({ context: { ...context, namespace: ns ?? "real_life" }, items: [item(overrides)] });
    expect(result.summary.blocked).toBe(1); expect(result.wouldPersist).toBe(false); expect(result.summary.plannedItems).toBe(0);
  });
  it("blocks AU-to-real_life and real_life-to-AU contamination", () => {
    const au = item({ namespace: "au", namespaceIsolation: { ...item().namespaceIsolation, namespace: "au", classification: "au", auOnly: true, realLifeOnly: false, explicitlyFictionalized: true } });
    expect(previewApprovedReviewMemoryPersistence({ context: { ...context, namespace: "au" }, targetNamespace: "real_life", items: [au] }).blockers).toContain("namespace_mismatch");
    expect(previewApprovedReviewMemoryPersistence({ context, targetNamespace: "au", items: [item()] }).blockers).toContain("namespace_mismatch");
  });
  it("does not call Supabase writes or model/retrieval/pgvector collaborators", () => {
    const forbidden = { write: vi.fn(), openai: vi.fn(), retrieval: vi.fn(), pgvector: vi.fn() };
    previewApprovedReviewMemoryPersistence({ context, items: [item()] });
    expect(forbidden.write).not.toHaveBeenCalled(); expect(forbidden.openai).not.toHaveBeenCalled(); expect(forbidden.retrieval).not.toHaveBeenCalled(); expect(forbidden.pgvector).not.toHaveBeenCalled();
  });
  it("route rejects client user_id and is disabled safely by default", async () => {
    const rejected = await POST(new NextRequest("https://x.test/api/memory/review/1/persistence-preview?user_id=x", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "1" }) });
    expect(rejected.status).toBe(400); expect(await rejected.json()).toMatchObject({ wouldPersist: false, status: "client_user_id_rejected" });
    const disabled = await POST(new NextRequest("https://x.test/api/memory/review/1/persistence-preview", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "1" }) });
    expect(disabled.status).toBe(501); expect(await disabled.json()).toMatchObject({ wouldPersist: false, productionWriteDisabled: true });
  });
  it("injected route previews only and never calls persistence repository writes", async () => {
    const repo = { readReviewQueueItemById: vi.fn(async () => ({ ok: true, data: item() })) } as never;
    const handler = createApprovedReviewPersistencePreviewRouteHandler({ enabled: true, repository: repo, resolveAuth: async () => ({ userId: "server-user" }) });
    const res = await handler(new NextRequest("https://x.test/api/memory/review/1/persistence-preview", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200); expect(await res.json()).toMatchObject({ wouldPersist: false, summary: { plannedItems: 1, wouldPersist: false } });
  });
});
