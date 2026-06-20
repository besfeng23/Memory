import { describe, expect, it } from "vitest";
import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { runMemoryIngestPersistencePreflight } from "@/lib/services/memory-ingest-persistence-preflight";
import { buildMemoryIngestWritePlan } from "@/lib/services/memory-ingest-write-plan-builder";

function makeContext(namespace: FutureMemoryIngestRequest["namespace"], userId = "server-auth-user"): RepositoryContext {
  return { userId, namespace, requestId: "req-1" };
}

function makeRequest(namespace: FutureMemoryIngestRequest["namespace"], metadata: Record<string, unknown> = {}, input = "Remember this later."): FutureMemoryIngestRequest {
  return { namespace, input, source_ref: null, idempotency_key: "write-plan-key-1234", metadata };
}

async function readyPlan(namespace: FutureMemoryIngestRequest["namespace"] = "real_life") {
  const context = makeContext(namespace);
  const request = makeRequest(namespace);
  const preflight = await runMemoryIngestPersistencePreflight({ context, request, requestHash: "hash", fingerprint: "fingerprint" });
  expect(preflight.ok).toBe(true);
  if (!preflight.ok) throw new Error("preflight failed");
  return buildMemoryIngestWritePlan({ context, request, preflight: preflight.data, requestHash: "hash", fingerprint: "fingerprint" });
}

describe("buildMemoryIngestWritePlan", () => {
  it("creates a no-write append-only plan for valid authenticated context and ready preflight", async () => {
    const result = await readyPlan("real_life");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      status: "planned",
      namespace: "real_life",
      userId: "server-auth-user",
      wouldPersist: false,
      appendOnly: true,
      usesClientUserId: false,
      wouldCallModel: false,
      wouldPerformRetrieval: false,
      requestHash: "hash",
      fingerprint: "fingerprint",
      blockers: [],
    });
  });

  it("keeps planned operations ordered, planned-only, append-only, and no-write", async () => {
    const result = await readyPlan();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.plannedOperations.map((operation) => operation.operation)).toEqual([
      "validate_namespace_boundary",
      "insert_memory_source",
      "insert_memory_item",
      "insert_memory_patch",
      "insert_audit_log",
      "finalize_idempotency_record",
    ]);
    expect(result.data.plannedOperations.every((operation) => operation.mode === "planned_only")).toBe(true);
    expect(result.data.plannedOperations.every((operation) => operation.writesNow === false)).toBe(true);
    expect(result.data.plannedOperations.every((operation) => operation.appendOnly === true)).toBe(true);
  });

  it("does not call Supabase or models because it only consumes plain inputs", async () => {
    const result = await readyPlan();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.wouldPersist).toBe(false);
    expect(result.data.wouldCallModel).toBe(false);
    expect(result.data.wouldPerformRetrieval).toBe(false);
  });

  it("uses repository context ownership and blocks client-supplied user_id override attempts", async () => {
    const context = makeContext("real_life", "server-owner");
    const request = makeRequest("real_life", { user_id: "client-owner" });
    const preflight = await runMemoryIngestPersistencePreflight({ context, request, requestHash: "hash", fingerprint: "fingerprint" });
    expect(preflight.ok).toBe(true);
    if (!preflight.ok) return;

    const result = buildMemoryIngestWritePlan({ context, request, preflight: preflight.data });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("blocked");
    expect(result.data.userId).toBe("server-owner");
    expect(result.data.usesClientUserId).toBe(false);
    expect(result.data.blockers).toContain("client_user_id_override_attempt");
  });

  it("blocks mismatched namespaces and missing input or authenticated user", async () => {
    const context = makeContext("real_life", " ");
    const request = makeRequest("au", {}, " ");
    const preflight = await runMemoryIngestPersistencePreflight({ context, request, requestHash: "hash", fingerprint: "fingerprint" });
    expect(preflight.ok).toBe(true);
    if (!preflight.ok) return;

    const result = buildMemoryIngestWritePlan({ context, request, preflight: preflight.data });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("blocked");
    expect(result.data.blockers).toEqual(expect.arrayContaining(["preflight_not_ready", "namespace_mismatch", "missing_authenticated_user", "missing_input"]));
  });

  it.each(["real_life", "au"] as const)("keeps %s plans namespace-scoped", async (namespace) => {
    const result = await readyPlan(namespace);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.namespace).toBe(namespace);
    expect(result.data.namespaceIsolation.namespace).toBe(namespace);
    expect(result.data.namespaceIsolation.realLifeCannotConsumeAuEvidence).toBe(true);
    expect(result.data.namespaceIsolation.auContentRemainsFictionalStoryScoped).toBe(true);
  });

  it("keeps AU/story plans from being treated as real-life evidence", async () => {
    const result = await readyPlan("au");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.namespace).toBe("au");
    expect(result.data.namespaceIsolation.realLifeCannotConsumeAuEvidence).toBe(true);
    expect(result.data.plannedOperations[0]).toMatchObject({ operation: "validate_namespace_boundary", target: "namespace_policy" });
  });
});
