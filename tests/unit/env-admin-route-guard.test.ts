import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { requireApiUser } from "@/lib/security/api-auth";
import { POST as unlockEnvAdmin } from "@/app/api/admin/env/status/route";
import { hasEnvAdminCapability, requireEnvAdmin } from "@/lib/services/env-admin-route-guard";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("@/lib/security/api-auth", () => ({
  requireApiUser: vi.fn(),
}));

const envKeys = ["PANDORA_INTERNAL_OPERATOR_TOKEN", "PANDORA_INTERNAL_JOB_TOKEN", "PANDORA_ENV_BROKER_ENABLED"] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function mockRequestTokens(input: { bearer?: string; explicit?: string; cookie?: string } = {}) {
  vi.mocked(headers).mockResolvedValue({
    get(name: string) {
      const normalized = name.toLowerCase();
      if (normalized === "authorization" && input.bearer) return `Bearer ${input.bearer}`;
      if (normalized === "x-pandora-env-admin-token") return input.explicit ?? null;
      return null;
    },
  } as never);
  vi.mocked(cookies).mockResolvedValue({
    get(name: string) {
      return name === "pandora_env_admin" && input.cookie ? { value: input.cookie } : undefined;
    },
  } as never);
}

function mockApiUser(appMetadata: Record<string, unknown>) {
  vi.mocked(requireApiUser).mockResolvedValue({
    response: null,
    user: { id: "user-1", app_metadata: appMetadata },
  } as never);
}

describe("Env Broker admin guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PANDORA_ENV_BROKER_ENABLED = "true";
    delete process.env.PANDORA_INTERNAL_OPERATOR_TOKEN;
    delete process.env.PANDORA_INTERNAL_JOB_TOKEN;
    mockRequestTokens();
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("rejects plain Supabase sessions without env-admin app metadata", async () => {
    mockApiUser({});

    const result = await requireEnvAdmin();

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  it("accepts explicit env-admin capabilities from app metadata", async () => {
    mockApiUser({ adminCapabilities: ["env:admin"] });

    const result = await requireEnvAdmin();

    expect(result.response).toBeNull();
    expect(result.user).toEqual({ id: "user-1", authType: "supabase" });
  });

  it("accepts the internal operator token without a Supabase session", async () => {
    process.env.PANDORA_INTERNAL_OPERATOR_TOKEN = "0123456789abcdef01234567";
    mockRequestTokens({ bearer: "0123456789abcdef01234567" });

    const result = await requireEnvAdmin();

    expect(requireApiUser).not.toHaveBeenCalled();
    expect(result.response).toBeNull();
    expect(result.user).toEqual({ id: "env-operator-token", authType: "operator_token" });
  });

  it("does not treat user-editable profile metadata as authorization", () => {
    expect(hasEnvAdminCapability({ app_metadata: {} } as never)).toBe(false);
    expect(hasEnvAdminCapability({ app_metadata: { role: "env_admin" } } as never)).toBe(true);
    expect(hasEnvAdminCapability({ app_metadata: { roles: ["env:broker"] } } as never)).toBe(true);
  });

  it("scopes the operator unlock cookie to the guarded page and API routes", async () => {
    const token = "0123456789abcdef01234567";
    process.env.PANDORA_INTERNAL_OPERATOR_TOKEN = token;
    const form = new FormData();
    form.set("operator_key", token);

    const response = await unlockEnvAdmin(new NextRequest("https://example.test/api/admin/env/status", { method: "POST", body: form }));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(303);
    expect(setCookie).toContain("pandora_env_admin=");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=strict");
    expect(setCookie).toContain("Secure");
  });
});
