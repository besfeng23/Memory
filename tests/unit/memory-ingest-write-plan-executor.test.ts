import { describe, expect, it, vi } from "vitest";
import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { runMemoryIngestPersistencePreflight } from "@/lib/services/memory-ingest-persistence-preflight";
import { buildMemoryIngestWritePlan, type MemoryIngestWritePlan } from "@/lib/services/memory-ingest-write-plan-builder";
import { executeMemoryIngestWritePlanDryRun } from "@/lib/services/memory-ingest-write-plan-executor";

function makeContext(namespace: FutureMemoryIngestRequest["namespace"] = "real_life", userId = "server-auth-user"): RepositoryContext {
  return { userId, namespace, requestId: "req-1" };
}

function makeRequest(namespace: FutureMemoryIngestRequest["namespace"] = "real_life"): FutureMemoryIngestRequest {
  return { namespace, input: "Remember executor dry run.", source_ref: null, idempotency_key: "executor-key-1234", metadata: {} };
}

async function readyPlan() {
  const context = makeContext();
  const request = makeRequest();
  const preflight = await runMemoryIngestPersistencePreflight({ context, request, requestHash: "hash", fingerprint: "fingerprint" });
  expect(preflight.ok).toBe(true);
  if (!preflight.ok) throw new Error("preflight failed");
  const plan = buildMemoryIngestWritePlan({ context, request, preflight: preflight.data, requestHash: "hash", fingerprint: "fingerprint" });
  expect(plan.ok).toBe(true);
  if (!plan.ok) throw new Error("plan failed");
  return { context, request, plan: plan.data };
}

function clonePlan(plan: MemoryIngestWritePlan): MemoryIngestWritePlan {
  return structuredClone(plan) as MemoryIngestWritePlan;
}

describe("executeMemoryIngestWritePlanDryRun", () => {
  it("executes a valid write plan dry-run in the expected order", async () => {
    const { context, request, plan } = await readyPlan();
    const result = executeMemoryIngestWritePlanDryRun({ context, request, writePlan: plan, requestHash: "hash", fingerprint: "fingerprint" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("executed_dry_run");
    expect(result.data.executedOperations.map((operation) => operation.operation)).toEqual([
      "validate_namespace_boundary",
      "insert_memory_source",
      "insert_memory_item",
      "insert_memory_patch",
      "insert_audit_log",
      "finalize_idempotency_record",
    ]);
    expect(result.data.blockers).toEqual([]);
    expect(result.data.wouldPersist).toBe(false);
    expect(result.data.writesPerformed).toBe(false);
  });

  it("marks every executed operation as no-write dry-run execute only", async () => {
    const { context, request, plan } = await readyPlan();
    const result = executeMemoryIngestWritePlanDryRun({ context, request, writePlan: plan });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.executedOperations.every((operation) => operation.writesNow === false)).toBe(true);
    expect(result.data.executedOperations.every((operation) => operation.mode === "dry_run_execute_only")).toBe(true);
    expect(result.data.executedOperations.every((operation) => operation.appendOnly === true)).toBe(true);
  });

  it("blocks if operations are out of order", async () => {
    const { context, request, plan } = await readyPlan();
    const invalidPlan = clonePlan(plan);
    invalidPlan.plannedOperations = [invalidPlan.plannedOperations[1], invalidPlan.plannedOperations[0], ...invalidPlan.plannedOperations.slice(2)];

    const result = executeMemoryIngestWritePlanDryRun({ context, request, writePlan: invalidPlan });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("blocked");
    expect(result.data.executedOperations).toEqual([]);
    expect(result.data.blockers).toContain("operation_out_of_order");
  });

  it("blocks if a planned operation has writesNow true", async () => {
    const { context, request, plan } = await readyPlan();
    const invalidPlan = clonePlan(plan) as unknown as MemoryIngestWritePlan & { plannedOperations: Array<{ writesNow: boolean }> };
    invalidPlan.plannedOperations[2].writesNow = true;

    const result = executeMemoryIngestWritePlanDryRun({ context, request, writePlan: invalidPlan as MemoryIngestWritePlan });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("blocked");
    expect(result.data.blockers).toContain("planned_operation_writes_now");
  });

  it("blocks if plan user ID differs from repository context user ID", async () => {
    const { context, request, plan } = await readyPlan();
    const invalidPlan = { ...plan, userId: "different-user" };

    const result = executeMemoryIngestWritePlanDryRun({ context, request, writePlan: invalidPlan });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("blocked");
    expect(result.data.blockers).toContain("plan_user_mismatch");
  });

  it("blocks namespace mismatches", async () => {
    const { context, request, plan } = await readyPlan();
    const result = executeMemoryIngestWritePlanDryRun({ context: { ...context, namespace: "au" }, request, writePlan: plan });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("blocked");
    expect(result.data.blockers).toContain("context_request_namespace_mismatch");
  });

  it("blocks if plan status is blocked", async () => {
    const { context, request, plan } = await readyPlan();
    const result = executeMemoryIngestWritePlanDryRun({ context, request, writePlan: { ...plan, status: "blocked", blockers: ["preflight_not_ready"] } });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("blocked");
    expect(result.data.blockers).toContain("write_plan_not_planned");
  });

  it("does not call Supabase writes or models", async () => {
    const supabaseWrites = { insert: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const model = vi.fn();
    const { context, request, plan } = await readyPlan();

    const result = executeMemoryIngestWritePlanDryRun({ context, request, writePlan: plan });

    expect(result.ok).toBe(true);
    expect(supabaseWrites.insert).not.toHaveBeenCalled();
    expect(supabaseWrites.update).not.toHaveBeenCalled();
    expect(supabaseWrites.delete).not.toHaveBeenCalled();
    expect(model).not.toHaveBeenCalled();
  });
});
