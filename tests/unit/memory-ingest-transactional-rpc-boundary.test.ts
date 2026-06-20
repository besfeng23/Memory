import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MEMORY_INGEST_TRANSACTIONAL_RPC_NAME, type MemoryIngestTransactionalRpcPlan } from "@/lib/db/memory-ingest-rpc-contract";
import { buildMemoryIngestTransactionRpcRequest, executeMemoryIngestTransactionRpc, type MemoryIngestRpcClient } from "@/lib/db/supabase-memory-ingest-rpc-adapter";
import type { RepositoryContext } from "@/lib/db/repository-context";

function context(namespace: "real_life" | "au" = "real_life"): RepositoryContext {
  return { userId: "server-user", namespace, requestId: "req-1" };
}

function operationOrder(namespace: "real_life" | "au" = "real_life") {
  return [
    { operation: "validate_namespace_boundary", target: "namespace", namespace, appendOnly: true, writesNow: false },
    { operation: "insert_memory_source", target: "memory_sources", namespace, appendOnly: true, writesNow: false },
    { operation: "insert_memory_item", target: "memory_items", namespace, appendOnly: true, writesNow: false },
    { operation: "insert_memory_patch", target: "memory_patches", namespace, appendOnly: true, writesNow: false },
    { operation: "insert_audit_log", target: "audit_logs", namespace, appendOnly: true, writesNow: false },
    { operation: "finalize_idempotency_record", target: "idempotency_records", namespace, appendOnly: true, writesNow: false },
  ] as const;
}

function plan(namespace: "real_life" | "au" = "real_life"): MemoryIngestTransactionalRpcPlan {
  return {
    context: context(namespace),
    namespace,
    source: { source_ref: "src" },
    memoryItem: { body: "remember this" },
    memoryPatch: { patch_type: "ingest_append" },
    auditLog: { action: "memory_ingest_append_planned" },
    idempotencyFinalization: { idempotency_key: "idem" },
    requestHash: "hash",
    fingerprint: "fingerprint",
    operationOrder: [...operationOrder(namespace)],
    appendOnly: true,
  };
}

function successClient(calls: unknown[]): MemoryIngestRpcClient {
  return {
    async rpc(name, args) {
      calls.push({ name, args });
      return {
        data: {
          status: "applied",
          generatedIds: { memorySourceId: "source-id", memoryItemId: "item-id", memoryPatchId: "patch-id" },
          auditLogId: "audit-id",
          idempotencyRecordId: "idem-id",
          warnings: [],
          blockers: [],
          transactionRef: "tx-ref",
          traceId: "trace-id",
        },
        error: null,
      };
    },
  };
}

describe("memory ingest transactional RPC boundary", () => {
  it("builds a valid RPC request from a validated transaction plan", () => {
    const result = buildMemoryIngestTransactionRpcRequest(plan());
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.invariants).toMatchObject({ atomic: true, rollbackOnFailure: true, appendOnly: true, namespaceIsolation: true });
    expect(result.ok && result.data.operationOrder.at(-1)?.operation).toBe("finalize_idempotency_record");
  });

  it("derives userId only from repository context", () => {
    const result = buildMemoryIngestTransactionRpcRequest(plan());
    expect(result.ok && result.data.userId).toBe("server-user");
  });

  it.each(["user_id", "userId"] as const)("rejects client-supplied %s", (field) => {
    const unsafe = plan();
    unsafe.source = { [field]: "client-user" };
    const result = buildMemoryIngestTransactionRpcRequest(unsafe);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.details?.blockers).toContain("client_user_id_rejected");
  });

  it("rejects namespace mismatch", () => {
    const mismatch = { ...plan("real_life"), namespace: "au" as const };
    const result = buildMemoryIngestTransactionRpcRequest(mismatch);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.details?.blockers).toContain("namespace_mismatch");
  });

  it.each(["real_life", "au"] as const)("keeps %s namespace scoped explicitly", (namespace) => {
    const result = buildMemoryIngestTransactionRpcRequest(plan(namespace));
    expect(result.ok && result.data.namespace).toBe(namespace);
    expect(result.ok && result.data.operationOrder.every((operation) => operation.namespace === namespace)).toBe(true);
  });

  it("blocks missing source/item/patch/audit/idempotency payloads", () => {
    const missing = plan();
    missing.source = {};
    missing.memoryItem = {};
    missing.memoryPatch = {};
    missing.auditLog = {};
    missing.idempotencyFinalization = {};
    const result = buildMemoryIngestTransactionRpcRequest(missing);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.details?.blockers).toEqual(expect.arrayContaining(["missing_source_payload", "missing_memoryItem_payload", "missing_memoryPatch_payload", "missing_auditLog_payload", "missing_idempotencyFinalization_payload"]));
  });

  it("requires idempotency finalization last", () => {
    const reordered = plan();
    reordered.operationOrder = [...operationOrder()].reverse();
    const result = buildMemoryIngestTransactionRpcRequest(reordered);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.details?.blockers).toContain("idempotency_finalization_not_last");
  });

  it("blocks update/delete/overwrite operations and appendOnly false", () => {
    const unsafe = plan();
    unsafe.operationOrder = [{ operation: "update_memory_item", target: "memory_items", namespace: "real_life", appendOnly: false, writesNow: false }];
    const result = buildMemoryIngestTransactionRpcRequest(unsafe);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.details?.blockers).toEqual(expect.arrayContaining(["forbidden_mutation_operation", "operation_not_append_only"]));
  });

  it("returns generated IDs on mocked RPC success", async () => {
    const calls: unknown[] = [];
    const result = await executeMemoryIngestTransactionRpc({ context: context(), plan: plan(), client: successClient(calls) });
    expect(result.ok && result.data.generatedIds.memoryItemId).toBe("item-id");
    expect(calls).toHaveLength(1);
  });

  it("returns structured repository error on mocked RPC error", async () => {
    const client: MemoryIngestRpcClient = { rpc: async () => ({ data: null, error: { message: "boom", code: "XX" } }) };
    const result = await executeMemoryIngestTransactionRpc({ context: context(), plan: plan(), client });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("database_error");
  });

  it("calls only the injected Supabase-like rpc method", async () => {
    const calls: Array<{ name: string }> = [];
    await executeMemoryIngestTransactionRpc({ context: context(), plan: plan(), client: successClient(calls) });
    expect(calls[0].name).toBe(MEMORY_INGEST_TRANSACTIONAL_RPC_NAME);
  });

  it("does not import Supabase constructors, service-role helpers, models, retrieval, pgvector, MCP, or GPT Actions", () => {
    const source = readFileSync("lib/db/supabase-memory-ingest-rpc-adapter.ts", "utf8");
    expect(source).not.toMatch(/createClient|service-role|serviceRole|server\.ts|retrieval|pgvector|openai|model|mcp|gpt action/i);
  });

  it("keeps public route production-disabled and not directly importing the RPC adapter", () => {
    const route = readFileSync("app/api/memory/ingest/route.ts", "utf8");
    expect(route).not.toContain("supabase-memory-ingest-rpc-adapter");
    expect(route).toMatch(/production|disabled|createMemoryIngestRouteHandler/i);
  });
});
