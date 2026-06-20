import { describe, expect, it } from "vitest";
import { createRouteRepositoryContext } from "@/lib/api/route-repository-context";

describe("createRouteRepositoryContext", () => {
  it("creates context from the authenticated user id", () => {
    const result = createRouteRepositoryContext({
      user: { id: "auth-user-1" },
      namespace: "real_life",
      requestId: "request-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userId).toBe("auth-user-1");
      expect(result.data.namespace).toBe("real_life");
      expect(result.data.requestId).toBe("request-1");
    }
  });

  it("returns auth_required when no authenticated user exists", () => {
    const result = createRouteRepositoryContext({
      user: null,
      namespace: "au",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("auth_required");
    }
  });
});
