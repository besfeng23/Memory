import { describe, expect, it } from "vitest";
import { discoverEnvKeys } from "@/lib/services/env-discovery-service";
import { buildEnvCatalog, PHASE5A_QUEUE_SAFE, PHASE5C_SAFE_PRODUCTION, PANDORA_AUTOPILOT_VALUES } from "@/lib/services/env-broker-service";
import { fingerprintEnvValue } from "@/lib/services/env-fingerprint-service";
import { generateEnvSecret } from "@/lib/services/env-secret-service";
import { classifyEnvKey, validateEnvKeyValue } from "@/lib/services/env-validation-service";
import { pushVercelEnv } from "@/lib/services/vercel-env-provider";

describe("Pandora Env Broker", () => {
  it("discovers and catalogs all runtime gates", () => {
    const discovered = discoverEnvKeys();
    const keys = new Set(discovered.map((i) => i.key));
    for (const key of ["PANDORA_ENABLE_PERSISTED_MEMORY_READ", "PANDORA_ENABLE_MEMORY_DISTILLATION", "PANDORA_ENABLE_MCP", "PANDORA_SENSITIVE_MEMORY_REQUIRES_APPROVAL"]) expect(keys.has(key)).toBe(true);
    expect(buildEnvCatalog().find((i) => i.key === "PANDORA_SENSITIVE_MEMORY_REQUIRES_APPROVAL")?.safeDefault).toBe("true");
  });
  it("enforces autopilot allowed values", () => {
    expect(PANDORA_AUTOPILOT_VALUES).toContain("off");
    expect(validateEnvKeyValue("PANDORA_MEMORY_AUTOPILOT", "mode", "capture_low_risk", [...PANDORA_AUTOPILOT_VALUES]).ok).toBe(true);
    expect(validateEnvKeyValue("PANDORA_MEMORY_AUTOPILOT", "mode", "always", [...PANDORA_AUTOPILOT_VALUES]).ok).toBe(false);
  });
  it("does not expose generated raw secrets through metadata/fingerprints", () => {
    const secret = generateEnvSecret();
    expect(secret.fingerprint).toMatch(/^sha256:[a-f0-9]{16}$/);
    expect(secret.fingerprint).not.toContain(secret.value);
    expect(fingerprintEnvValue("raw-secret-value")).not.toContain("raw-secret-value");
  });
  it("blocks NEXT_PUBLIC secret classification", () => {
    expect(classifyEnvKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")).toBe("public_safe");
    expect(validateEnvKeyValue("NEXT_PUBLIC_SECRET_TOKEN", "secret").ok).toBe(false);
  });
  it("keeps presets safe", () => {
    expect(PHASE5C_SAFE_PRODUCTION.PANDORA_ENABLE_MODEL_CALLS).toBe("false");
    expect(PHASE5C_SAFE_PRODUCTION.PANDORA_ENABLE_PUBLIC_MEMORY_READ).toBe("false");
    expect(PHASE5A_QUEUE_SAFE.PANDORA_MEMORY_AUTOPILOT).toBe("queue");
    expect(PHASE5A_QUEUE_SAFE.PANDORA_AUTO_CAPTURE_LOW_RISK).toBe("false");
  });
  it("marks missing provider token blocked without logging request body", async () => {
    const result = await pushVercelEnv({ projectId: "p", teamId: "t", key: "PANDORA_INTERNAL_JOB_TOKEN", value: "super-secret" }, "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("blocked_missing_provider_token");
  });
  it("lists unknown keys but does not mark them managed", () => {
    const unknown = buildEnvCatalog().filter((i) => i.classificationSuggestion === "unknown");
    expect(unknown.every((i) => i.managed === false)).toBe(true);
  });
});
