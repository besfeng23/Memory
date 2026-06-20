import { describe, expect, it } from "vitest";
import { MEMORY_INGEST_ROUTE_FEATURE_FLAG } from "@/lib/api/memory-ingest-feature-flag";
import { runMemoryIngestRouteTestHarness } from "@/lib/api/memory-ingest-route-test-harness";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";

const body = {
  namespace: "real_life",
  input: "remember this safely",
  source_ref: null,
  idempotency_key: "test-key-1234",
  metadata: {},
};

describe("runMemoryIngestRouteTestHarness", () => {
  it("refuses to run outside test mode", async () => {
    const result = await runMemoryIngestRouteTestHarness({
      env: { NODE_ENV: "production", [MEMORY_INGEST_ROUTE_FEATURE_FLAG]: "true" },
      user: { id: "auth-user-1" },
      body,
      responseCacheRepository: { getByKey: async () => repositoryError("not_found", "not found") },
      runCandidate: async () => repositoryOk({ status: "completed", namespace: "real_life", sourceIds: [], warnings: [] }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
      expect(result.error.details?.mode).toBe("blocked_non_test");
    }
  });

  it("runs through the test-only harness with injected dependencies", async () => {
    const result = await runMemoryIngestRouteTestHarness({
      env: { NODE_ENV: "test", [MEMORY_INGEST_ROUTE_FEATURE_FLAG]: "true" },
      user: { id: "auth-user-1" },
      body,
      responseCacheRepository: { getByKey: async () => repositoryError("not_found", "not found") },
      runCandidate: async (input) =>
        repositoryOk({
          status: "completed",
          namespace: input.request.namespace,
          memoryItemId: "memory-test-1",
          sourceIds: [],
          warnings: [],
        }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe(200);
      expect(result.data.route).toBe("/api/memory/ingest");
      expect(result.data.body.status).toBe("completed");
    }
  });
});
