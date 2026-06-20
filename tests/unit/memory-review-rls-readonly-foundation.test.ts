import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { createMemoryReviewRouteHandler } from "@/lib/api/memory-review-route-handler";
import { reviewItemToInsertRow, rowToReviewItem } from "@/lib/db/memory-review-queue-row-mapper";
import type { CreateReviewQueueItemInput } from "@/lib/db/memory-review-queue-repository-contract";
import { SupabaseMemoryReviewQueueRepository } from "@/lib/db/supabase-memory-review-queue-repository";

const ctx = { userId: "00000000-0000-0000-0000-000000000001", namespace: "real_life" as const };
const item = (): CreateReviewQueueItemInput => ({ id: "11111111-1111-1111-1111-111111111111", status: "pending_review", extractedCandidateId: "c", candidateType: "profile_fact", normalizedText: "Safe preview", evidence: { spans: [], spanRanges: [], hasEvidence: true }, sensitivity: { level: "low", requiresSensitiveReview: false, resolved: false }, requiresReview: true, appendOnly: true, proposedOperation: "append", sourceMetadata: { source: "manual" }, namespaceIsolation: { namespace: "real_life", classification: "real_life", auOnly: false, realLifeOnly: true, explicitlyFictionalized: false, mixedContent: false, realLifeCannotConsumeAuEvidence: true, auContentCannotBecomeRealLifeEvidence: true }, blockers: [], warnings: [], createdAt: "2026-06-20T00:00:00.000Z", updatedAt: "2026-06-20T00:00:00.000Z", audit: { createdByUserId: ctx.userId, updatedByUserId: ctx.userId, createdFrom: "contract_test", decisionTrail: [] } });

describe("RLS read-only review queue foundation", () => {
  it("migration enables RLS and ownership policies", () => {
    const sql = readFileSync("supabase/migrations/20260620006200_memory_review_queue_rls_tables.sql", "utf8");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("user_id = auth.uid()");
    expect(sql).toContain("memory_review_queue_decisions_insert_own_item");
    expect(sql).not.toMatch(/service_role/i);
    expect(sql).toContain("No seed rows");
  });
  it("mapper uses context userId and validates namespace/status/evidence", () => {
    const row = reviewItemToInsertRow(ctx, { ...item(), user_id: "attacker" } as unknown as CreateReviewQueueItemInput);
    expect(row.ok && row.data.user_id).toBe(ctx.userId);
    expect(reviewItemToInsertRow(ctx, { ...item(), namespace: "au" }).ok).toBe(false);
    expect(reviewItemToInsertRow(ctx, { ...item(), status: "bad" as never }).ok).toBe(false);
    expect(reviewItemToInsertRow(ctx, { ...item(), evidence: {} as never }).ok).toBe(false);
  });
  it("read mapper rejects user and namespace mismatches", () => {
    const row = reviewItemToInsertRow(ctx, item());
    if (!row.ok) throw new Error("row");
    const db = { ...row.data, created_at: row.data.created_at!, updated_at: row.data.updated_at! };
    expect(rowToReviewItem({ ...ctx, userId: "other" }, db).ok).toBe(false);
    expect(rowToReviewItem({ ...ctx, namespace: "au" }, db).ok).toBe(false);
  });
  it("repository scopes list/read with injected client only", async () => {
    const calls: Array<[string, unknown]> = [];
    const dbrow = { ...reviewItemToInsertRow(ctx, item()).data, created_at: item().createdAt, updated_at: item().updatedAt };
    type Chain = PromiseLike<{ data: unknown; error: unknown }> & { select: () => Chain; eq: (c: string, v: unknown) => Chain; order: () => Chain; limit: () => Promise<{ data: unknown[]; error: null }>; single: () => Promise<{ data: unknown; error: null }> };
    const q = { select: () => q, eq: (c: string, v: unknown) => { calls.push([c, v]); return q; }, order: () => q, limit: () => Promise.resolve({ data: [dbrow], error: null }), single: () => Promise.resolve({ data: dbrow, error: null }), then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise.resolve({ data: [dbrow], error: null }).then(resolve) } as Chain;
    const repo = new SupabaseMemoryReviewQueueRepository({ from: () => q });
    await repo.listReviewQueueItems(ctx); await repo.readReviewQueueItemById(ctx, item().id);
    expect(calls).toContainEqual(["user_id", ctx.userId]);
    expect(calls).toContainEqual(["namespace", ctx.namespace]);
    const source = readFileSync("lib/db/supabase-memory-review-queue-repository.ts", "utf8");
    expect(source).not.toMatch(/service.*role|createClient|supabaseAdmin/i);
  });
  it("route factory rejects client user_id, returns DTOs, and is read-only", async () => {
    const repo = { listReviewQueueItems: async () => ({ ok: true, data: [{ ...item(), userId: ctx.userId, namespace: ctx.namespace }] }), readReviewQueueItemById: async () => ({ ok: true, data: { ...item(), userId: ctx.userId, namespace: ctx.namespace } }), countReviewItemsByStatus: async () => ({ ok: true, data: [] }) };
    const handler = createMemoryReviewRouteHandler({ repository: repo as never, resolveSession: async () => ({ userId: ctx.userId }) });
    expect((await handler.list(new NextRequest("https://x/review?user_id=bad"))).status).toBe(400);
    const body = await (await handler.list(new NextRequest("https://x/review"))).json();
    expect(body.items[0]).toMatchObject({ productionWriteDisabled: true, approvalActionsDisabled: true });
    expect((await handler.mutate(new NextRequest("https://x/review", { method: "POST", body: "{}" }))).status).toBe(501);
  });
});
