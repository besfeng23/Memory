import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { POST as publicPersistPost } from "@/app/api/memory/review/[id]/persist/route";
import { createApprovedReviewMemoryPersistenceExecutorRouteHandler } from "@/lib/api/approved-review-memory-persistence-executor-route-handler";
import { InMemoryApprovedReviewMemoryPersistenceRepository } from "@/lib/db/in-memory-approved-review-memory-persistence-repository";
import { SupabaseApprovedReviewMemoryPersistenceRepository } from "@/lib/db/supabase-approved-review-memory-persistence-repository";
import { mapApprovedReviewPlanToRpcPayload } from "@/lib/db/approved-review-memory-persistence-row-mapper";
import { buildApprovedReviewPersistenceIdempotencyKey } from "@/lib/services/approved-review-memory-persistence-idempotency";
import { executeApprovedReviewMemoryPersistence } from "@/lib/services/approved-review-memory-persistence-executor";
import { resolveApprovedReviewPersistenceGate } from "@/lib/services/approved-review-memory-persistence-gate";
import { previewApprovedReviewMemoryPersistence } from "@/lib/services/approved-review-memory-persistence-preview";
import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";

const context = { userId: "server-user", namespace: "real_life" as const, requestId: "r" };
function reviewItem(overrides: Partial<MemoryReviewQueueItem> = {}): MemoryReviewQueueItem { return { id: "review-1", status: "approved_for_append", userId: "server-user", namespace: "real_life", extractedCandidateId: "c1", candidateType: "fact", normalizedText: "User likes tea.", evidence: { hasEvidence: true, spans: [{ text: "likes tea", span: { start: 5, end: 14 } }], spanRanges: [{ start: 5, end: 14 }] }, sensitivity: { level: "low", requiresSensitiveReview: false, resolved: true }, requiresReview: true, appendOnly: true, proposedOperation: "append", sourceMetadata: { source: "contract_test", requestId: "r" }, sourceRef: "src", namespaceIsolation: { namespace: "real_life", classification: "real_life", auOnly: false, realLifeOnly: true, explicitlyFictionalized: false, mixedContent: false, realLifeCannotConsumeAuEvidence: true, auContentCannotBecomeRealLifeEvidence: true }, blockers: [], warnings: [], createdAt: "2026-06-23T00:00:00Z", updatedAt: "2026-06-23T00:00:00Z", audit: { createdByUserId: "server-user", updatedByUserId: "server-user", createdFrom: "contract_test", decisionTrail: [{ action: "approve_append", at: "2026-06-23T00:00:00Z", reviewerUserId: "server-user" }] }, ...overrides }; }
function preview(item = reviewItem()) { return previewApprovedReviewMemoryPersistence({ context, items: [item] }); }
const passGate = { env: { PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE: "true" }, headers: new Headers({ "x-pandora-internal-persistence-mode": "approved-review-executor" }), routeContext: "internal" as const };

describe("approved review memory persistence executor boundary", () => {
  it("gate blocks by default and requires env flag plus internal header/admin capability", () => {
    const base = { context, item: reviewItem(), preview: preview() };
    expect(resolveApprovedReviewPersistenceGate(base).blockers).toEqual(expect.arrayContaining(["env_flag_disabled", "missing_internal_admin_capability", "public_route_context"]));
    expect(resolveApprovedReviewPersistenceGate({ ...base, ...passGate }).allowed).toBe(true);
    expect(resolveApprovedReviewPersistenceGate({ ...base, ...passGate, headers: new Headers() }).blockers).toContain("missing_internal_admin_capability");
  });
  it("gate rejects client user_id/userId and namespace mismatch", () => {
    expect(resolveApprovedReviewPersistenceGate({ context, item: reviewItem(), preview: preview(), ...passGate, userId: "evil" }).blockers).toContain("client_user_id_override_attempt");
    expect(resolveApprovedReviewPersistenceGate({ context, item: reviewItem({ namespace: "au" }), preview: preview(), ...passGate }).blockers).toContain("namespace_mismatch");
  });
  it("executor returns blocked result when gate fails and calls injected repository only when gate passes", async () => {
    const repo = new InMemoryApprovedReviewMemoryPersistenceRepository();
    const blocked = await executeApprovedReviewMemoryPersistence({ context, item: reviewItem(), preview: preview(), repository: repo });
    expect(blocked.executed).toBe(false); expect(repo.calls).toEqual([]);
    const executed = await executeApprovedReviewMemoryPersistence({ context, item: reviewItem(), preview: preview(), repository: repo, ...passGate });
    expect(executed.executed).toBe(true); expect(repo.calls).toEqual(["source", "item", "patch", "audit", "mark"]);
  });
  it("does not call Supabase/OpenAI/model/retrieval/vector collaborators", async () => {
    const forbidden = { supabase: vi.fn(), openai: vi.fn(), model: vi.fn(), retrieval: vi.fn(), vector: vi.fn() };
    await executeApprovedReviewMemoryPersistence({ context, item: reviewItem(), preview: preview(), repository: new InMemoryApprovedReviewMemoryPersistenceRepository(), ...passGate });
    Object.values(forbidden).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });
  it("in-memory repository appends only and rejects overwrite/delete/update plus namespace mismatch", async () => {
    const repo = new InMemoryApprovedReviewMemoryPersistenceRepository(); const plan = preview().plans[0];
    await repo.appendMemoryPatchFromApprovedReview(context, plan.patch!); await repo.appendMemoryPatchFromApprovedReview(context, plan.patch!);
    expect(repo.patches).toHaveLength(2);
    await expect(repo.appendMemoryPatchFromApprovedReview(context, { ...plan.patch!, operation: "update" as never })).resolves.toMatchObject({ ok: false });
    await expect(repo.appendMemoryItemFromApprovedReview(context, { ...plan.item!, namespace: "au" })).resolves.toMatchObject({ ok: false, error: { code: "namespace_mismatch" } });
  });
  it("RPC payload builder rejects client user_id and idempotency keys are deterministic", () => {
    const plan = preview().plans[0];
    const key = buildApprovedReviewPersistenceIdempotencyKey({ context, reviewItemId: plan.itemId, decisionId: "decision-1", previewFingerprint: "fp" });
    expect(buildApprovedReviewPersistenceIdempotencyKey({ context, reviewItemId: plan.itemId, decisionId: "decision-1", previewFingerprint: "fp" })).toBe(key);
    expect(mapApprovedReviewPlanToRpcPayload({ context, plan, decisionId: "decision-1", idempotencyKey: key, previewFingerprint: "fp", clientPayload: { user_id: "evil" } })).toMatchObject({ ok: false });
  });
  it("Supabase repository calls only the transactional RPC and never direct inserts", async () => {
    const plan = preview().plans[0];
    const key = buildApprovedReviewPersistenceIdempotencyKey({ context, reviewItemId: plan.itemId, decisionId: "decision-1", previewFingerprint: "fp" });
    const client = { from: vi.fn(), rpc: vi.fn(async () => ({ data: { executed: true, productionRouteEnabled: false, publicRouteEnabled: false, appendOnly: true, namespace: "real_life", userId: "server-user", counts: { sources: 1, items: 1, patches: 1, auditLogs: 1, markedReviewItems: 1, blocked: 0, failed: 0 }, blockers: [], warnings: [], source: { kind: "memory_source_append", id: "s", appendOnly: true }, item: { kind: "memory_item_append", id: "i", appendOnly: true }, patch: { kind: "memory_patch_append", id: "p", appendOnly: true }, auditLog: { kind: "audit_log_append", id: "a", appendOnly: true } }, error: null })) };
    const repo = new SupabaseApprovedReviewMemoryPersistenceRepository(client);
    await expect(repo.executeApprovedReviewPersistence!(context, { plan, decisionId: "decision-1", idempotencyKey: key, previewFingerprint: "fp" })).resolves.toMatchObject({ ok: true });
    expect(client.rpc).toHaveBeenCalledOnce();
    expect(client.rpc).toHaveBeenCalledWith("memory_execute_approved_review_persistence", expect.objectContaining({ p_review_item_id: "review-1", p_namespace: "real_life", p_idempotency_key: key }));
    expect(client.from).not.toHaveBeenCalled();
  });
  it("public persist route is disabled, ingest remains disabled, preview remains no-write, and public route cannot execute approved items", async () => {
    const res = await publicPersistPost(); expect(res.status).toBe(501); expect(await res.json()).toMatchObject({ executed: false, message: "approved-review memory persistence execution is disabled" });
    expect(preview().wouldPersist).toBe(false);
    const route = createApprovedReviewMemoryPersistenceExecutorRouteHandler({ enabled: true, resolveAuth: async () => ({ userId: "server-user" }), reviewQueueRepository: { readReviewQueueItemById: vi.fn(async () => ({ ok: true, data: reviewItem() })) } as never, persistenceRepository: new InMemoryApprovedReviewMemoryPersistenceRepository(), env: () => ({ PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE: "true" }) as NodeJS.ProcessEnv });
    const publicAttempt = await route(new NextRequest("https://x.test/api/memory/review/review-1/persist", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "review-1" }) });
    expect(publicAttempt.status).toBe(403); expect(await publicAttempt.json()).toMatchObject({ executed: false });
  });
});
