import { describe, expect, it } from "vitest";
import { validateMemoryIngestTransactionPlan, type MemoryIngestTransactionOperation } from "@/lib/db/memory-ingest-transaction-contract";

function operations(namespace: "real_life" | "au" = "real_life"): MemoryIngestTransactionOperation[] {
  return [
    { operation: "validate_namespace_boundary", target: "namespace_policy", namespace, appendOnly: true, writesNow: false },
    { operation: "insert_memory_source", target: "memory_sources", namespace, appendOnly: true, writesNow: false },
    { operation: "insert_memory_item", target: "memory_items", namespace, appendOnly: true, writesNow: false },
    { operation: "insert_memory_patch", target: "memory_patches", namespace, appendOnly: true, writesNow: false },
    { operation: "insert_audit_log", target: "audit_logs", namespace, appendOnly: true, writesNow: false },
    { operation: "finalize_idempotency_record", target: "idempotency_records", namespace, appendOnly: true, writesNow: false },
  ];
}

describe("validateMemoryIngestTransactionPlan", () => {
  it("allows valid operation order", () => {
    const result = validateMemoryIngestTransactionPlan({ namespace: "real_life", operations: operations() });
    expect(result.ok && result.data.status).toBe("valid");
  });

  it("blocks missing audit log", () => {
    const result = validateMemoryIngestTransactionPlan({ namespace: "real_life", operations: operations().filter((operation) => operation.operation !== "insert_audit_log") });
    expect(result.ok && result.data.blockers).toContain("missing_audit_log");
  });

  it("blocks missing memory patch", () => {
    const result = validateMemoryIngestTransactionPlan({ namespace: "real_life", operations: operations().filter((operation) => operation.operation !== "insert_memory_patch") });
    expect(result.ok && result.data.blockers).toContain("missing_memory_patch");
  });

  it("blocks idempotency finalization not last", () => {
    const ops = operations();
    const result = validateMemoryIngestTransactionPlan({ namespace: "real_life", operations: [ops[0], ops[5], ...ops.slice(1, 5)] });
    expect(result.ok && result.data.blockers).toContain("idempotency_finalization_not_last");
  });

  it.each(["update_memory_item", "delete_memory_item", "overwrite_memory_item"])("blocks %s operations", (operation) => {
    const ops = operations();
    ops[2] = { ...ops[2], operation };
    const result = validateMemoryIngestTransactionPlan({ namespace: "real_life", operations: ops });
    expect(result.ok && result.data.blockers).toContain("forbidden_mutation_operation");
  });

  it("blocks appendOnly false", () => {
    const ops = operations();
    ops[1] = { ...ops[1], appendOnly: false };
    const result = validateMemoryIngestTransactionPlan({ namespace: "real_life", operations: ops });
    expect(result.ok && result.data.blockers).toContain("operation_not_append_only");
  });

  it("blocks writesNow true during no-write planning phase", () => {
    const ops = operations();
    ops[1] = { ...ops[1], writesNow: true };
    const result = validateMemoryIngestTransactionPlan({ namespace: "real_life", operations: ops });
    expect(result.ok && result.data.blockers).toContain("no_write_planning_phase_required");
  });

  it.each(["real_life", "au"] as const)("keeps %s transaction plans namespace scoped", (namespace) => {
    const result = validateMemoryIngestTransactionPlan({ namespace, operations: operations(namespace) });
    expect(result.ok && result.data.namespace).toBe(namespace);
    expect(result.ok && result.data.publicRouteMustUseBoundary).toBe(true);
  });

  it("blocks cross-namespace transaction plans", () => {
    const ops = operations("au");
    const result = validateMemoryIngestTransactionPlan({ namespace: "real_life", operations: ops });
    expect(result.ok && result.data.blockers).toContain("namespace_mismatch");
  });
});
