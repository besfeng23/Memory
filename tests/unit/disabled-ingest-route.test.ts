import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
}));

vi.mock("@/lib/security/auth", () => ({
  getCurrentUser: getCurrentUserMock,
}));

import { POST } from "@/app/api/memory/ingest/route";

describe("disabled ingest route", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
  });

  it("returns 401 before evaluating disabled ingest without a user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("auth_required");
    expect(body.status).toBe("disabled_stub");
  });

  it("returns 501 for an authenticated user without enabling ingest", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_id" });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("not_implemented");
    expect(body.status).toBe("disabled_stub");
    expect(body.authenticated).toBe(true);
  });
});
