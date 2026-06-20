import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
}));

vi.mock("@/lib/security/auth", () => ({
  getCurrentUser: getCurrentUserMock,
}));

import { POST } from "@/app/api/memory/ingest/route";

function makeRequest(body: unknown) {
  return new NextRequest("https://pandora.test/api/memory/ingest", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("disabled ingest route", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
  });

  it("returns 401 before parsing without a user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ namespace: "real_life", input: "hello" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("auth_required");
    expect(body.status).toBe("disabled_stub");
  });

  it("returns 400 for invalid authenticated input", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_id" });

    const response = await POST(makeRequest({ namespace: "real_life", input: "" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("validation_failed");
    expect(body.status).toBe("disabled_stub");
    expect(body.authenticated).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("returns 501 for valid authenticated input without enabling ingest", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_id" });

    const response = await POST(
      makeRequest({ namespace: "real_life", input: "Remember this later.", idempotency_key: "  key-1234  " }),
    );
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("not_implemented");
    expect(body.status).toBe("disabled_stub");
    expect(body.authenticated).toBe(true);
    expect(body.namespace).toBe("real_life");
    expect(body.idempotency).toEqual({
      key_present: true,
      key_stored: false,
      claim_attempted: false,
      conflict_evaluated: false,
      conflict_status: "not_evaluated",
    });
    expect(body.response_cache).toEqual({
      cache_supported: false,
      cache_lookup_attempted: false,
      cache_write_attempted: false,
      replay_supported: false,
      replay_status: "not_available",
    });
  });
});
