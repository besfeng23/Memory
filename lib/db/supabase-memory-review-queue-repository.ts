import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";
import type { AppendReviewDecisionInput, ArchiveReviewItemInput, CreateReviewQueueItemInput, MemoryReviewQueueRepository, ReviewQueueDecisionRecord, ReviewQueueListFilters, ReviewQueueStatusCount } from "@/lib/db/memory-review-queue-repository-contract";
import { reviewItemToInsertRow, rowToReviewItem, type MemoryReviewQueueItemRow } from "@/lib/db/memory-review-queue-row-mapper";

export const memoryReviewQueueTableNames = { items: "memory_review_queue_items", decisions: "memory_review_queue_decisions" } as const;
export const memoryReviewQueueColumns = { userId: "user_id", namespace: "namespace", status: "status", createdAt: "created_at", reviewItemId: "review_item_id" } as const;
type DbResult = { data: unknown; error: unknown; count?: number | null };
type RpcResult = { data: unknown; error: null | { message?: string; code?: string; details?: unknown } };
type Query = PromiseLike<DbResult> & { insert?: (v: unknown) => Query; select?: (c?: string) => Query; eq?: (c: string, v: unknown) => Query; order?: (c: string, o?: unknown) => Query; limit?: (n: number) => Query; single?: () => PromiseLike<DbResult> };
export type SupabaseLikeReviewQueueClient = { from: (table: string) => Query; rpc?: (fn: string, args: Record<string, unknown>) => Promise<RpcResult> };
const safeLimit = (n?: number) => Math.max(1, Math.min(n ?? 50, 100));

export class SupabaseMemoryReviewQueueRepository implements MemoryReviewQueueRepository {
  constructor(private readonly client: SupabaseLikeReviewQueueClient) {}
  async createReviewItem(context: RepositoryContext, input: CreateReviewQueueItemInput) { return this.createReviewQueueItem(context, input); }
  async createReviewItems(context: RepositoryContext, inputs: CreateReviewQueueItemInput[]) { return this.createManyReviewQueueItems(context, inputs); }
  async createReviewQueueItem(context: RepositoryContext, input: CreateReviewQueueItemInput) {
    const row = reviewItemToInsertRow(context, input); if (!row.ok) return row;
    const res = await this.client.from(memoryReviewQueueTableNames.items).insert?.(row.data).select?.("*").single?.();
    if (!res || res.error) return repositoryError("database_error", "Failed to create review queue item.", { error: res?.error });
    return rowToReviewItem(context, res.data as MemoryReviewQueueItemRow);
  }
  async createManyReviewQueueItems(context: RepositoryContext, inputs: CreateReviewQueueItemInput[]) {
    const rows = inputs.map((i) => reviewItemToInsertRow(context, i)); const bad = rows.find((r) => !r.ok); if (bad && !bad.ok) return bad;
    const res = await this.client.from(memoryReviewQueueTableNames.items).insert?.(rows.map((r) => r.ok && r.data)).select?.("*");
    if (!res || res.error || !Array.isArray(res.data)) return repositoryError("database_error", "Failed to create review queue items.", { error: res?.error });
    const mapped = (res.data as unknown[]).map((r: unknown) => rowToReviewItem(context, r as MemoryReviewQueueItemRow)); const err = mapped.find((m) => !m.ok); if (err && !err.ok) return err;
    return repositoryOk(mapped.map((m) => (m as { ok: true; data: MemoryReviewQueueItem }).data));
  }
  async listReviewItems(context: RepositoryContext, filters?: ReviewQueueListFilters) { return this.listReviewQueueItems(context, filters); }
  async listReviewQueueItems(context: RepositoryContext, filters: ReviewQueueListFilters = {}) {
    let q = this.client.from(memoryReviewQueueTableNames.items).select?.("*").eq?.("user_id", context.userId).eq?.("namespace", context.namespace);
    if (filters.status) q = q?.eq?.("status", filters.status); q = q?.order?.("created_at", { ascending: false }).limit?.(safeLimit(filters.limit));
    const res: DbResult | undefined = q ? await q : undefined; if (!res || res.error || !Array.isArray(res.data)) return repositoryError("database_error", "Failed to list review queue items.", { error: res?.error });
    const mapped = (res.data as unknown[]).map((r: unknown) => rowToReviewItem(context, r as MemoryReviewQueueItemRow)); const err = mapped.find((m) => !m.ok); if (err && !err.ok) return err;
    return repositoryOk(mapped.map((m) => (m as { ok: true; data: MemoryReviewQueueItem }).data));
  }
  async readReviewItem(context: RepositoryContext, id: string) { return this.readReviewQueueItemById(context, id); }
  async readReviewQueueItemById(context: RepositoryContext, id: string) {
    const res = await this.client.from(memoryReviewQueueTableNames.items).select?.("*").eq?.("id", id).eq?.("user_id", context.userId).eq?.("namespace", context.namespace).single?.();
    if (!res || res.error || !res.data) return repositoryError("not_found", "Review queue item was not found in this user namespace.");
    return rowToReviewItem(context, res.data as MemoryReviewQueueItemRow);
  }
  async appendReviewDecision(context: RepositoryContext, input: AppendReviewDecisionInput) {
    if (input.client_user_id || input.clientUserId) return repositoryError("validation_failed", "Client-supplied user_id is rejected; reviewer identity comes from server repository context only.");
    if (!this.client.rpc) return repositoryError("database_error", "Injected Supabase client does not expose rpc for memory_review_append_decision.", { rpc: "memory_review_append_decision" });
    const { data, error } = await this.client.rpc("memory_review_append_decision", { p_item_id: input.itemId, p_action: input.action, p_decision_metadata: { reason: input.reason ?? null, requestId: context.requestId ?? null, serverContextUserId: context.userId, namespace: context.namespace, appendOnly: true, wouldPersist: false }, p_namespace: context.namespace });
    if (error) return repositoryError("database_error", error.message ?? "Review decision append RPC failed.", { code: error.code, details: error.details, rpc: "memory_review_append_decision" });
    const row = data as Partial<ReviewQueueDecisionRecord> | null;
    if (!row?.id || !row.itemId) return repositoryError("database_error", "Review decision append RPC returned an invalid decision snapshot.", { rpc: "memory_review_append_decision" });
    if (row.userId && row.userId !== context.userId) return repositoryError("validation_failed", "Review decision RPC returned a user mismatch.");
    if (row.namespace && row.namespace !== context.namespace) return repositoryError("namespace_mismatch", "Review decision RPC returned a namespace mismatch.");
    return repositoryOk({ id: row.id, itemId: row.itemId, userId: row.userId ?? context.userId, namespace: row.namespace ?? context.namespace, action: row.action ?? input.action, reason: row.reason, createdAt: row.createdAt ?? new Date().toISOString(), audit: row.audit ?? { appendOnly: true, wouldPersist: false } });
  }
  async archiveReviewItem(context: RepositoryContext, input: ArchiveReviewItemInput) { const decision = await this.appendReviewDecision(context, { itemId: input.itemId, action: "archive", reason: input.reason }); if (!decision.ok) return decision; return this.readReviewQueueItemById(context, input.itemId); }
  async countReviewItemsByStatus(context: RepositoryContext) {
    const listed = await this.listReviewQueueItems(context, { limit: 100 }); if (!listed.ok) return listed;
    const counts = new Map<string, number>(); listed.data.forEach((i: MemoryReviewQueueItem) => counts.set(i.status, (counts.get(i.status) ?? 0) + 1));
    return repositoryOk(Array.from(counts, ([status, count]) => ({ status: status as ReviewQueueStatusCount["status"], count })));
  }
}
