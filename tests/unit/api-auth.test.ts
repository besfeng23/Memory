import { describe, expect, it } from "vitest";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/security/api-auth";

const forbiddenSecretKeys = ["token", "refresh", "session", "service_role", "openai", "secret", "password"];

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("API auth response helpers", () => {
  it("returns a JSON-safe unauthenticated response", async () => {
    const response = unauthorizedResponse();
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      error: {
        code: "unauthenticated",
        message: "Authentication required.",
      },
    });

    const serialized = JSON.stringify(body).toLowerCase();
    for (const key of forbiddenSecretKeys) {
      expect(serialized).not.toContain(key);
    }
  });

  it("returns a JSON-safe forbidden response", async () => {
    const response = forbiddenResponse();
    const body = await readJson(response);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      ok: false,
      error: {
        code: "forbidden",
        message: "Forbidden.",
      },
    });

    const serialized = JSON.stringify(body).toLowerCase();
    for (const key of forbiddenSecretKeys) {
      expect(serialized).not.toContain(key);
    }
  });
});
