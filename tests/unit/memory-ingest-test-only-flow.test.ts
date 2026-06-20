import { describe, expect, it } from "vitest";
import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import { createRouteRepositoryContext } from "@/lib/api/route-repository-context";
import { MEMORY_INGEST_ROUTE_FEATURE_FLAG } from "@/lib/api/memory-ingest-feature-flag";
import { isMemoryIngestTestModeEnabled } from "@/lib/api/memory-ingest-test-mode";
import { runGuardedIngest } from "@/lib/services/guarded-ingest-service";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";

const request: FutureMemoryIngestRequest = {
  namespace: "real_life",
  input: "remember this safely",
  source_ref: null,
  idempotency_key: "test-key-1234",
  metadata: {},
};

describe("memory ingest test-only flow", () => {
  it("stays disabled outside test mode even when the flag is present", () => {
    expect(
      isMemoryIngestTestModeEnabled({
        NODE_ENV: "production",
        [MEMORY_INGEST_ROUTE_FEATURE_FLAG]: "true",
      }),
    ).toBe(false);
  });

  it("runs the guarded service only in test mode with injected dependencies", async () => {
    const context = createRouteRepositoryContext({
      user: { id: "auth-user-1" },
      namespace: request.namespace,
      requestId: "test-request-1",
    });

    expect(context.ok).toBe(true);
    if (!context.ok) return;

    const enabled = isMemoryIngestTestModeEnabled({
      NODE_ENV: "test",
      [MEMORY_INGEST_ROUTE_FEATURE_FLAG]: "true",
    });

    const result = await runGuardedIngest({
      enabled,
      context: context.data,
      route: "/api/memory/ingest",
      request,
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
      expect(result.data.status).toBe("completed");
      expect(result.data.namespace).toBe("real_life");
    }
  });
});
