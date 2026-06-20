import { describe, expect, it } from "vitest";
import { runGuardedIngest } from "@/lib/services/guarded-ingest-service";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";

const context: RepositoryContext = { userId: "user_a", namespace: "real_life" };
const request: FutureMemoryIngestRequest = {
  namespace: "real_life",
  input: "remember this",
  source_ref: null,
  idempotency_key: "key-1234",
  metadata: {},
};

describe("runGuardedIngest", () => {
  it("refuses to run when disabled", async () => {
    const result = await runGuardedIngest({
      context,
      route: "/api/memory/ingest",
      request,
      responseCacheRepository: { getByKey: async () => repositoryError("not_found", "not found") },
      runCandidate: async () => repositoryOk({ status: "completed", namespace: "real_life", sourceIds: [], warnings: [] }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation_failed");
  });

  it("runs the injected runner when enabled", async () => {
    const result = await runGuardedIngest({
      enabled: true,
      context,
      route: "/api/memory/ingest",
      request,
      responseCacheRepository: { getByKey: async () => repositoryError("not_found", "not found") },
      runCandidate: async () => repositoryOk({ status: "completed", namespace: "real_life", sourceIds: [], warnings: [] }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("completed");
  });
});
