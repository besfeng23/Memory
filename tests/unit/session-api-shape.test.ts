import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/security/auth", () => ({
  getCurrentUser: vi.fn(),
}));

import { GET } from "@/app/api/session/route";
import { getCurrentUser } from "@/lib/security/auth";

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

describe("GET /api/session response shape", () => {
  beforeEach(() => {
    mockedGetCurrentUser.mockReset();
  });

  it("returns a safe unauthenticated shape", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ authenticated: false, user: null });
  });

  it("returns only safe authenticated user fields", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: "user_test_id",
      email: "user@example.com",
      created_at: "2026-01-01T00:00:00.000Z",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      role: "authenticated",
    } as Awaited<ReturnType<typeof getCurrentUser>>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      authenticated: true,
      user: {
        id: "user_test_id",
        email: "user@example.com",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    });

    const serialized = JSON.stringify(body).toLowerCase();
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("refresh_token");
    expect(serialized).not.toContain("service_role");
    expect(serialized).not.toContain("openai");
    expect(Object.keys(body.user)).toEqual(["id", "email", "created_at"]);
  });
});
