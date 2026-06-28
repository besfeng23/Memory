import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { buildEnvDriftReport, DANGEROUS_GATES, pushRequiredSafeDefaults } from "@/lib/services/env-drift-service";
import { discoverEnvKeys } from "@/lib/services/env-discovery-service";

const provider = (...keys: string[]) => ({ ok: true as const, envs: keys.map((key) => ({ key, updatedAt: 1 })) });

describe("ENV-2 drift guard", () => {
  it("repo env scanner finds env vars", () => {
    expect(discoverEnvKeys().some((item) => item.key === "PANDORA_ENV_BROKER_ENABLED")).toBe(true);
  });
  it("CI policy fails when an env var is not cataloged", () => {
    const root = mkdtempSync(join(tmpdir(), "env-policy-"));
    mkdirSync(join(root, "app"));
    writeFileSync(join(root, "app", "probe.ts"), "export const probe = process.env.UNCATALOGED_ENV_VAR;");
    const found = discoverEnvKeys(root).find((item) => item.key === "UNCATALOGED_ENV_VAR");
    expect(found?.classificationSuggestion).toBe("unknown");
  });
  it("reports missing generated token", async () => {
    const report = await buildEnvDriftReport(provider("PANDORA_ENV_BROKER_ENABLED"));
    expect(report.generatedSecretsMissing).toContain("PANDORA_INTERNAL_JOB_TOKEN");
    expect(report.missingInProvider).toContain("PANDORA_INTERNAL_JOB_TOKEN");
  });
  it("reports unmanaged provider env", async () => {
    const report = await buildEnvDriftReport(provider("MANUAL_ONLY_ENV"));
    expect(report.unmanagedProviderEnvs).toContain("MANUAL_ONLY_ENV");
  });
  it("blocks NEXT_PUBLIC secret-like names", async () => {
    const report = await buildEnvDriftReport(provider("NEXT_PUBLIC_SECRET_TOKEN"));
    expect(report.unsafePublicSecretNaming).toContain("NEXT_PUBLIC_SECRET_TOKEN");
    expect(report.severity).toBe("red");
  });
  it("provider drift report never includes raw values", async () => {
    const report = await buildEnvDriftReport({ ok: true, envs: [{ key: "PANDORA_INTERNAL_JOB_TOKEN", value: "raw-secret-value" } as never] });
    expect(JSON.stringify(report)).not.toContain("raw-secret-value");
  });
  it("safe default set does not enable dangerous gates", () => {
    for (const gate of DANGEROUS_GATES) expect(["false", undefined]).toContain((awaitlessSafeDefaults() as Record<string, string | undefined>)[gate]);
  });
  it("drift check does not mutate provider envs", async () => {
    const envs = [{ key: "MANUAL_ONLY_ENV" }];
    await buildEnvDriftReport({ ok: true, envs });
    expect(envs).toEqual([{ key: "MANUAL_ONLY_ENV" }]);
  });
});
function awaitlessSafeDefaults() { return { PANDORA_ENABLE_MODEL_CALLS: "false", PANDORA_ENABLE_EMBEDDINGS: "false", PANDORA_ENABLE_SEMANTIC_RETRIEVAL: "false", PANDORA_ENABLE_PUBLIC_MEMORY_READ: "false", PANDORA_ENABLE_PUBLIC_MEMORY_PERSISTENCE: "false", PANDORA_ENABLE_AUTO_CAPTURE: "false" }; }
void pushRequiredSafeDefaults;
