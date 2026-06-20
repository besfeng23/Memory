import { describe, expect, it } from "vitest";
import { createDisabledResponseCacheRepository } from "@/lib/db/response-cache-contract";
import type { RepositoryContext } from "@/lib/db/repository-context";

const context: RepositoryContext = {
  userId: "user_a",
  namespace: "real_life",
};

describe("disabled response cache repository", () => {
  it("implements the contract without enabling storage", async () => {
    const repository = createDisabledResponseCacheRepository();
    const result = await repository.getByKey({ context, idempotencyKey: "key-1234" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
      expect(result.error.details?.operation).toBe("getByKey");
    }
  });
});
