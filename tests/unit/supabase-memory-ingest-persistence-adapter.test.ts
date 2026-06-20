import { describe, expect, it } from "vitest";
import { createSupabaseMemoryIngestPersistenceAdapter, type MemoryIngestSupabaseClient } from "@/lib/db/supabase-memory-ingest-persistence-adapter";
import type { InsertMemorySourceInput, MemoryIngestPersistenceBaseInput } from "@/lib/db/memory-ingest-persistence-contract";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { executeMemoryIngestPersistencePlan } from "@/lib/services/memory-ingest-persistence-executor";
import { buildMemoryIngestWritePlan } from "@/lib/services/memory-ingest-write-plan-builder";
import { runMemoryIngestPersistencePreflight } from "@/lib/services/memory-ingest-persistence-preflight";

type Call = { table: string; row: Record<string, unknown> };

function mockedClient(calls: Call[], failTable?: string): MemoryIngestSupabaseClient {
  return {
    from(table) {
      return {
        insert(row) {
          calls.push({ table, row });
          return { select: () => ({ single: async () => (table === failTable ? { data: null, error: { message: "boom" } } : { data: { id: `${table}-id` }, error: null }) }) };
        },
      };
    },
  };
}

function context(namespace: "real_life" | "au" = "real_life", userId = "server-user"): RepositoryContext {
  return { namespace, userId, requestId: "req-1" };
}

function base(namespace: "real_life" | "au" = "real_life", userId = "server-user"): MemoryIngestPersistenceBaseInput {
  const ctx = context(namespace, userId);
  return { context: ctx, namespace, userId, appendOnly: true, mode: "append_only", requestHash: "hash", fingerprint: "fingerprint" };
}

async function writePlan(namespace: "real_life" | "au" = "real_life") {
  const ctx = context(namespace);
  const request = { namespace, input: "remember this", source_ref: "src", idempotency_key: "idem", metadata: { user_id: "client-user" } };
  const safeRequest = { ...request, metadata: {} };
  const preflight = await runMemoryIngestPersistencePreflight({ context: ctx, request: safeRequest, requestHash: "hash", fingerprint: "fingerprint" });
  if (!preflight.ok) throw new Error("preflight failed");
  const plan = buildMemoryIngestWritePlan({ context: ctx, request: safeRequest, preflight: preflight.data, requestHash: "hash", fingerprint: "fingerprint" });
  if (!plan.ok) throw new Error("plan failed");
  return { ctx, request, safeRequest, plan: plan.data };
}

describe("createSupabaseMemoryIngestPersistenceAdapter", () => {
  it("inserts source with context userId only and ignores metadata user_id", async () => {
    const calls: Call[] = [];
    const adapter = createSupabaseMemoryIngestPersistenceAdapter({ client: mockedClient(calls) });
    const result = await adapter.insertMemorySource({ ...base(), userId: "server-user", sourceRef: "src", metadata: { user_id: "client-user" } });
    expect(result.ok && result.data.memorySourceId).toBe("memory_sources-id");
    expect(calls[0]).toMatchObject({ table: "memory_sources" });
    expect(calls[0].row.user_id).toBe("server-user");
    expect(calls[0].row.user_id).not.toBe("client-user");
  });

  it("inserts memory item with context userId only", async () => {
    const calls: Call[] = [];
    const adapter = createSupabaseMemoryIngestPersistenceAdapter({ client: mockedClient(calls) });
    await adapter.insertMemoryItem({ ...base(), memorySourceId: "source-id", input: "body", metadata: { userId: "client" } });
    expect(calls[0].table).toBe("memory_items");
    expect(calls[0].row.user_id).toBe("server-user");
    expect(calls[0].row.body).toBe("body");
  });

  it("inserts memory patch and audit log as append-only rows", async () => {
    const calls: Call[] = [];
    const adapter = createSupabaseMemoryIngestPersistenceAdapter({ client: mockedClient(calls) });
    await adapter.insertMemoryPatch({ ...base(), memoryItemId: "item", memorySourceId: "source", patchType: "ingest_append", metadata: {} });
    await adapter.insertAuditLog({ ...base(), memorySourceId: "source", memoryItemId: "item", memoryPatchId: "patch", action: "memory_ingest_append_planned", metadata: {} });
    expect(calls.map((call) => call.table)).toEqual(["memory_patches", "audit_logs"]);
    expect(calls[0].row.before_snapshot).toBeNull();
    expect(calls[1].row.before_snapshot).toBeNull();
  });

  it("finalizes idempotency only after planned operations through the executor order", async () => {
    const calls: Call[] = [];
    const adapter = createSupabaseMemoryIngestPersistenceAdapter({ client: mockedClient(calls) });
    const { ctx, safeRequest, plan } = await writePlan();
    const result = await executeMemoryIngestPersistencePlan({ enabled: true, context: ctx, request: safeRequest, writePlan: plan, repository: adapter });
    expect(result.ok && result.data.status).toBe("persisted");
    expect(calls.map((call) => call.table)).toEqual(["memory_sources", "memory_items", "memory_patches", "audit_logs", "idempotency_records"]);
  });

  it("rejects namespace mismatch", async () => {
    const adapter = createSupabaseMemoryIngestPersistenceAdapter({ client: mockedClient([]) });
    const result = await adapter.insertMemorySource({ ...(base() as InsertMemorySourceInput), context: context("real_life"), namespace: "au", sourceRef: "src", metadata: {} });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("namespace_mismatch");
  });

  it("returns repository errors on mocked database failure", async () => {
    const adapter = createSupabaseMemoryIngestPersistenceAdapter({ client: mockedClient([], "memory_sources") });
    const result = await adapter.insertMemorySource({ ...base(), sourceRef: "src", metadata: {} });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("database_error");
  });

  it("does not expose update/delete/overwrite methods", () => {
    const adapter = createSupabaseMemoryIngestPersistenceAdapter({ client: mockedClient([]) });
    expect(Object.keys(adapter).sort()).toEqual(["finalizeIdempotencyRecord", "insertAuditLog", "insertMemoryItem", "insertMemoryPatch", "insertMemorySource"].sort());
    expect("update" in adapter).toBe(false);
    expect("delete" in adapter).toBe(false);
    expect("overwrite" in adapter).toBe(false);
  });

  it("does not call OpenAI/model/retrieval code and only uses injected Supabase tables", async () => {
    const calls: Call[] = [];
    const adapter = createSupabaseMemoryIngestPersistenceAdapter({ client: mockedClient(calls) });
    await adapter.insertMemorySource({ ...base(), sourceRef: "src", metadata: {} });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe("memory_sources");
  });

  it.each(["real_life", "au"] as const)("keeps %s namespace isolated", async (namespace) => {
    const calls: Call[] = [];
    const adapter = createSupabaseMemoryIngestPersistenceAdapter({ client: mockedClient(calls) });
    await adapter.insertMemoryItem({ ...base(namespace), memorySourceId: "source", input: "body", metadata: {} });
    expect(calls[0].row.namespace).toBe(namespace);
    expect(calls[0].row.memory_type).toBe(namespace === "au" ? "soft_canon" : "real_life_fact");
  });
});
