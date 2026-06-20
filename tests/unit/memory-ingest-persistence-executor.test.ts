import { describe, expect, it } from "vitest";
import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { MemoryIngestPersistenceRepository } from "@/lib/db/memory-ingest-persistence-contract";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryOk } from "@/lib/db/repository-result";
import { executeMemoryIngestPersistencePlan } from "@/lib/services/memory-ingest-persistence-executor";
import { runMemoryIngestPersistencePreflight } from "@/lib/services/memory-ingest-persistence-preflight";
import { buildMemoryIngestWritePlan, type MemoryIngestWritePlan } from "@/lib/services/memory-ingest-write-plan-builder";

function context(namespace: FutureMemoryIngestRequest["namespace"] = "real_life", userId = "server-user"): RepositoryContext {
  return { namespace, userId, requestId: "req" };
}

function request(namespace: FutureMemoryIngestRequest["namespace"] = "real_life", metadata: Record<string, unknown> = {}): FutureMemoryIngestRequest {
  return { namespace, input: "Remember this.", source_ref: "source", idempotency_key: "idem-key-1234", metadata };
}

async function plan(ctx = context(), req = request()) {
  const preflight = await runMemoryIngestPersistencePreflight({ context: ctx, request: req, requestHash: "hash", fingerprint: "fingerprint" });
  expect(preflight.ok).toBe(true);
  if (!preflight.ok) throw new Error("preflight failed");
  const built = buildMemoryIngestWritePlan({ context: ctx, request: req, preflight: preflight.data, requestHash: "hash", fingerprint: "fingerprint" });
  expect(built.ok).toBe(true);
  if (!built.ok) throw new Error("plan failed");
  return built.data;
}

function fakeRepository(calls: string[] = []): MemoryIngestPersistenceRepository {
  return {
    insertMemorySource: async (input) => {
      calls.push(`insertMemorySource:${input.namespace}:${input.userId}:${input.mode}`);
      return repositoryOk({ memorySourceId: "source-id" });
    },
    insertMemoryItem: async (input) => {
      calls.push(`insertMemoryItem:${input.memorySourceId}`);
      return repositoryOk({ memoryItemId: "item-id" });
    },
    insertMemoryPatch: async (input) => {
      calls.push(`insertMemoryPatch:${input.memoryItemId}:${input.patchType}`);
      return repositoryOk({ memoryPatchId: "patch-id" });
    },
    insertAuditLog: async (input) => {
      calls.push(`insertAuditLog:${input.memoryPatchId}:${input.action}`);
      return repositoryOk({ auditLogId: "audit-id" });
    },
    finalizeIdempotencyRecord: async (input) => {
      calls.push(`finalizeIdempotencyRecord:${input.auditLogId}:${input.idempotencyKey}`);
      return repositoryOk({ idempotencyRecordId: "idem-id" });
    },
  };
}

describe("executeMemoryIngestPersistencePlan", () => {
  it("refuses when not explicitly enabled", async () => {
    const ctx = context();
    const req = request();
    const result = await executeMemoryIngestPersistencePlan({ enabled: false, context: ctx, request: req, writePlan: await plan(ctx, req), repository: fakeRepository() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("blocked");
    expect(result.data.blockers).toContain("persistence_executor_disabled");
  });

  it("refuses if write plan is blocked", async () => {
    const ctx = context();
    const req = request();
    const blockedPlan = { ...(await plan(ctx, req)), status: "blocked" as const, blockers: ["x"] };
    const result = await executeMemoryIngestPersistencePlan({ enabled: true, context: ctx, request: req, writePlan: blockedPlan, repository: fakeRepository() });
    expect(result.ok && result.data.blockers).toContain("write_plan_not_planned");
  });

  it("refuses if operation order is wrong", async () => {
    const ctx = context();
    const req = request();
    const badPlan: MemoryIngestWritePlan = { ...(await plan(ctx, req)), plannedOperations: [...(await plan(ctx, req)).plannedOperations].reverse() };
    const result = await executeMemoryIngestPersistencePlan({ enabled: true, context: ctx, request: req, writePlan: badPlan, repository: fakeRepository() });
    expect(result.ok && result.data.blockers).toContain("invalid_operation_order");
  });

  it("refuses namespace and userId mismatches", async () => {
    const ctx = context("real_life", "server-user");
    const req = request("real_life");
    const badPlan = { ...(await plan(ctx, req)), namespace: "au" as const, userId: "other-user" };
    const result = await executeMemoryIngestPersistencePlan({ enabled: true, context: ctx, request: req, writePlan: badPlan, repository: fakeRepository() });
    expect(result.ok && result.data.blockers).toEqual(expect.arrayContaining(["namespace_mismatch", "user_id_mismatch"]));
  });

  it("refuses non-append-only and update/delete/overwrite operations", async () => {
    const ctx = context();
    const req = request();
    const base = await plan(ctx, req);
    const badPlan: MemoryIngestWritePlan = {
      ...base,
      appendOnly: false as true,
      plannedOperations: [{ ...base.plannedOperations[0], operation: "update_memory_item" as never, target: "memory_items", appendOnly: false as true }],
    };
    const result = await executeMemoryIngestPersistencePlan({ enabled: true, context: ctx, request: req, writePlan: badPlan, repository: fakeRepository() });
    expect(result.ok && result.data.blockers).toEqual(expect.arrayContaining(["write_plan_not_append_only", "operation_not_append_only", "forbidden_mutation_operation"]));
  });

  it("calls fake injected repository methods in the correct order without Supabase, model, or retrieval dependencies", async () => {
    const calls: string[] = [];
    const ctx = context();
    const req = request();
    const result = await executeMemoryIngestPersistencePlan({ enabled: true, context: ctx, request: req, writePlan: await plan(ctx, req), repository: fakeRepository(calls) });
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.status).toBe("persisted");
    expect(calls).toEqual([
      "insertMemorySource:real_life:server-user:append_only",
      "insertMemoryItem:source-id",
      "insertMemoryPatch:item-id:ingest_append",
      "insertAuditLog:patch-id:memory_ingest_append_planned",
      "finalizeIdempotencyRecord:audit-id:idem-key-1234",
    ]);
  });

  it("prevents client-supplied user_id from overriding repository context userId", async () => {
    const ctx = context("real_life", "server-owner");
    const req = request("real_life", { user_id: "client-owner" });
    const result = await executeMemoryIngestPersistencePlan({ enabled: true, context: ctx, request: req, writePlan: await plan(ctx, request("real_life")), repository: fakeRepository() });
    expect(result.ok && result.data.userId).toBe("server-owner");
    expect(result.ok && result.data.blockers).toContain("client_user_id_override_attempt");
  });

  it.each(["real_life", "au"] as const)("keeps %s namespace scope explicit", async (namespace) => {
    const calls: string[] = [];
    const ctx = context(namespace);
    const req = request(namespace);
    const result = await executeMemoryIngestPersistencePlan({ enabled: true, context: ctx, request: req, writePlan: await plan(ctx, req), repository: fakeRepository(calls) });
    expect(result.ok && result.data.namespace).toBe(namespace);
    expect(calls[0]).toContain(`${namespace}:server-user:append_only`);
  });
});

describe("persistence executor integration safety", () => {
  it("executor source never imports Supabase, models, or retrieval code", async () => {
    const fs = await import("node:fs/promises");
    const source = await fs.readFile("lib/services/memory-ingest-persistence-executor.ts", "utf8");
    expect(source).not.toMatch(/supabase/i);
    expect(source).not.toMatch(/from .*openai|from .*model|from .*retrieval/i);
    expect(source).not.toContain("retrieval-service");
  });

  it("public route remains production-disabled and does not wire the persistence executor", async () => {
    const fs = await import("node:fs/promises");
    const source = await fs.readFile("app/api/memory/ingest/route.ts", "utf8");
    expect(source).toContain("assertRouteDisabled");
    expect(source).toContain("status: \"disabled_stub\"");
    expect(source).not.toContain("executeMemoryIngestPersistencePlan");
  });
});
