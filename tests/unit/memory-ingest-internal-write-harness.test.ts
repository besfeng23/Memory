import { describe, expect, it } from "vitest";
import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { getMemoryIngestInternalWriteModeState, isMemoryIngestInternalWriteModeEnabled } from "@/lib/services/memory-ingest-internal-write-mode";
import { runMemoryIngestInternalWriteHarness } from "@/lib/services/memory-ingest-internal-write-harness";
import { createFakeMemoryIngestPersistenceRepository } from "../helpers/fake-memory-ingest-persistence-repository";

function context(namespace: FutureMemoryIngestRequest["namespace"] = "real_life", userId = "server-user"): RepositoryContext {
  return { namespace, userId, requestId: "req-test" };
}

function request(namespace: FutureMemoryIngestRequest["namespace"] = "real_life", metadata: Record<string, unknown> = {}): FutureMemoryIngestRequest {
  return { namespace, input: "Remember this test-only memory.", source_ref: "test-source", idempotency_key: "idem-test-1234", metadata };
}

const enabledEnv = { NODE_ENV: "test", PANDORA_ENABLE_MEMORY_INGEST_INTERNAL_WRITE_MODE: "true" };

describe("memory ingest internal write mode feature helper", () => {
  it("is disabled when the flag is absent", () => {
    const state = getMemoryIngestInternalWriteModeState({ NODE_ENV: "test" });
    expect(state.enabled).toBe(false);
    expect(state.status).toBe("disabled");
    expect(state.blockers).toContain("internal_write_mode_disabled");
    expect(isMemoryIngestInternalWriteModeEnabled({ NODE_ENV: "test" })).toBe(false);
  });

  it("blocks when the flag is set outside test mode", () => {
    const state = getMemoryIngestInternalWriteModeState({ NODE_ENV: "production", PANDORA_ENABLE_MEMORY_INGEST_INTERNAL_WRITE_MODE: "true" });
    expect(state.enabled).toBe(false);
    expect(state.status).toBe("blocked_non_test");
    expect(state.blockers).toContain("internal_write_mode_requires_node_env_test");
  });

  it("enables only under NODE_ENV=test and the explicit flag", () => {
    const state = getMemoryIngestInternalWriteModeState(enabledEnv);
    expect(state.enabled).toBe(true);
    expect(state.status).toBe("enabled_test_only");
    expect(isMemoryIngestInternalWriteModeEnabled(enabledEnv)).toBe(true);
  });
});

describe("runMemoryIngestInternalWriteHarness", () => {
  it("blocks when internal write mode flag is absent", async () => {
    const repository = createFakeMemoryIngestPersistenceRepository();
    const result = await runMemoryIngestInternalWriteHarness({ context: context(), request: request(), repository, env: { NODE_ENV: "test" } });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("internal_write_mode_disabled");
    expect(repository.calls).toEqual([]);
  });

  it("blocks when flag is set outside test mode", async () => {
    const repository = createFakeMemoryIngestPersistenceRepository();
    const result = await runMemoryIngestInternalWriteHarness({ context: context(), request: request(), repository, env: { NODE_ENV: "production", PANDORA_ENABLE_MEMORY_INGEST_INTERNAL_WRITE_MODE: "true" } });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("internal_write_mode_requires_node_env_test");
    expect(repository.calls).toEqual([]);
  });

  it("runs only when NODE_ENV=test and the flag is true, in the correct operation order", async () => {
    const repository = createFakeMemoryIngestPersistenceRepository();
    const result = await runMemoryIngestInternalWriteHarness({ context: context(), request: request(), repository, env: enabledEnv, requestHash: "hash", fingerprint: "fingerprint" });
    expect(result.status).toBe("completed_test_only");
    expect(result.execution?.status).toBe("persisted");
    expect(repository.calls.map((call) => call.method)).toEqual([
      "insertMemorySource",
      "insertMemoryItem",
      "insertMemoryPatch",
      "insertAuditLog",
      "finalizeIdempotencyRecord",
    ]);
  });

  it("sends only the authenticated repository context userId to the fake repository", async () => {
    const repository = createFakeMemoryIngestPersistenceRepository();
    const result = await runMemoryIngestInternalWriteHarness({ context: context("real_life", "server-owner"), request: request("real_life"), repository, env: enabledEnv });
    expect(result.status).toBe("completed_test_only");
    expect(repository.calls.every((call) => call.userId === "server-owner" && call.contextUserId === "server-owner")).toBe(true);
  });

  it("blocks client-supplied user_id override attempts before fake persistence receives calls", async () => {
    const repository = createFakeMemoryIngestPersistenceRepository();
    const result = await runMemoryIngestInternalWriteHarness({ context: context("real_life", "server-owner"), request: request("real_life", { user_id: "client-owner" }), repository, env: enabledEnv });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("client_user_id_override_attempt");
    expect(repository.calls).toEqual([]);
  });

  it.each(["real_life", "au"] as const)("keeps %s namespace scoped and explicit", async (namespace) => {
    const repository = createFakeMemoryIngestPersistenceRepository();
    const result = await runMemoryIngestInternalWriteHarness({ context: context(namespace), request: request(namespace), repository, env: enabledEnv });
    expect(result.status).toBe("completed_test_only");
    expect(result.namespace).toBe(namespace);
    expect(result.preflight?.namespaceIsolation.namespace).toBe(namespace);
    expect(result.preflight?.namespaceIsolation.realLifeCannotConsumeAuEvidence).toBe(true);
    expect(result.preflight?.namespaceIsolation.auContentRemainsFictionalStoryScoped).toBe(true);
    expect(repository.calls.every((call) => call.namespace === namespace)).toBe(true);
  });

  it("blocks namespace mismatch", async () => {
    const repository = createFakeMemoryIngestPersistenceRepository();
    const result = await runMemoryIngestInternalWriteHarness({ context: context("real_life"), request: request("au"), repository, env: enabledEnv });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("namespace_mismatch");
    expect(repository.calls).toEqual([]);
  });

  it("blocks transaction validation failure", async () => {
    const repository = createFakeMemoryIngestPersistenceRepository();
    const result = await runMemoryIngestInternalWriteHarness({
      context: context(),
      request: request(),
      repository,
      env: enabledEnv,
      options: { transactionOperationsOverride: [{ operation: "update_memory_item", target: "memory_items", namespace: "real_life", appendOnly: false, writesNow: false }] },
    });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toEqual(expect.arrayContaining(["invalid_operation_order", "operation_not_append_only", "forbidden_mutation_operation"]));
    expect(repository.calls).toEqual([]);
  });

  it("blocks persistence executor failure", async () => {
    const repository = createFakeMemoryIngestPersistenceRepository({ failAt: "insertMemoryPatch" });
    const result = await runMemoryIngestInternalWriteHarness({ context: context(), request: request(), repository, env: enabledEnv });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("database_error");
    expect(repository.calls.map((call) => call.method)).toEqual(["insertMemorySource", "insertMemoryItem", "insertMemoryPatch"]);
  });

  it("does not activate the public route, live Supabase clients, model calls, or retrieval", async () => {
    const fs = await import("node:fs/promises");
    const [routeSource, harnessSource] = await Promise.all([
      fs.readFile("app/api/memory/ingest/route.ts", "utf8"),
      fs.readFile("lib/services/memory-ingest-internal-write-harness.ts", "utf8"),
    ]);
    expect(routeSource).toContain("assertRouteDisabled");
    expect(routeSource).toContain("disabled_stub");
    expect(routeSource).not.toContain("runMemoryIngestInternalWriteHarness");
    expect(routeSource).not.toContain("executeMemoryIngestPersistencePlan");
    expect(harnessSource).not.toMatch(/create(Service|Server)?Client|service[-_ ]role|SUPABASE_SERVICE_ROLE/i);
    expect(harnessSource).not.toMatch(/openai|model|retrieval-service/i);
  });
});
