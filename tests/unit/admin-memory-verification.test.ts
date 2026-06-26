import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAdminMemoryVerification } from "@/lib/services/admin-memory-verification-loader";
import { adminMemoryRouteGuardExpectations } from "@/lib/services/admin-memory-route-guard-contract";
import type { PersistedMemoryReadRepository } from "@/lib/db/persisted-memory-read-repository-contract";

const root = process.cwd();
const okList = { ok: true as const, items: [], page: 1, pageSize: 25 };
let readCalls = 0;
const repo: PersistedMemoryReadRepository = {
  listMemoryItems: async () => { readCalls += 1; return okList; },
  listMemorySources: async () => okList,
  listMemoryPatches: async () => okList,
  listMemoryAuditEvents: async () => okList,
  getMemoryItemDetail: async () => ({ ok: false, blocker: { code: "not_found", message: "not found" } }),
  getMemorySourceDetail: async () => ({ ok: false, blocker: { code: "not_found", message: "not found" } }),
};
const session = { ok: true as const, session: { userId: "u1", authenticated: true, allowedNamespaces: ["real_life"], serverDerivedOnly: true, clientUserIdAccepted: false, serviceRoleUsed: false, publicReadAllowed: false, publicPersistenceAllowed: false }, blockers: [] };
const safeEnv = { VERCEL_GIT_COMMIT_SHA: "abc123", PANDORA_SKILLS_COMMIT_SHA: "skills123", PANDORA_ENABLE_PERSISTED_MEMORY_READ: "true" };

describe("admin memory verification safety", () => {
  it("builds a closure safety summary with public reads and unsafe gates disabled", async () => {
    const dto = await loadAdminMemoryVerification({ session, context: { userId: "u1", namespace: "real_life" }, repository: repo, env: safeEnv });
    expect(dto.readOnly).toBe(true);
    expect(dto.persistedMemoryReadGateStatus.status).toBe("available");
    expect(dto.publicReadStatus.status).toBe("disabled");
    expect(dto.unsafeGateStatus.status).toBe("disabled");
    expect(dto.unsafeGateStatus.enabledDangerousGates).toEqual([]);
    expect(dto.recommendation.closeRecommended).toBe(true);
    expect(dto.checklist.map((i) => i.label)).toEqual(expect.arrayContaining(["Authenticated browser", "Public redirect", "Read-only behavior", "Persisted read gate", "Audit proof availability", "Source/patch proof availability", "Skills commit proof availability"]));
  });

  it("does not override persistedMemoryReadEnabled when the deployed gate is false", async () => {
    readCalls = 0;
    const dto = await loadAdminMemoryVerification({ session, context: { userId: "u1", namespace: "real_life" }, repository: repo, env: { VERCEL_GIT_COMMIT_SHA: "abc123" } });
    expect(dto.persistedMemoryReadGateStatus.status).toBe("disabled");
    expect(dto.supabaseReadAvailability.status).toBe("disabled");
    expect(dto.supabaseReadAvailability.detail).toContain("no read proof was forced");
    expect(dto.recommendation.closeRecommended).toBe(false);
    expect(readCalls).toBe(0);
  });

  it("blocks closure when public reads or unsafe writes are enabled and lists the enabled gates", async () => {
    const dto = await loadAdminMemoryVerification({ session, context: { userId: "u1", namespace: "real_life" }, repository: repo, env: { ...safeEnv, PANDORA_ENABLE_PUBLIC_MEMORY_READ: "true", PANDORA_ENABLE_MEMORY_INGEST_PRODUCTION_WRITES: "true" } });
    expect(dto.publicReadStatus.status).toBe("blocked");
    expect(dto.unsafeGateStatus.status).toBe("blocked");
    expect(dto.unsafeGateStatus.detail).toContain("PANDORA_ENABLE_PUBLIC_MEMORY_READ");
    expect(dto.unsafeGateStatus.detail).toContain("PANDORA_ENABLE_MEMORY_INGEST_PRODUCTION_WRITES");
    expect(dto.recommendation.closeRecommended).toBe(false);
  });

  it("blocks closure for model, embedding, retrieval, GPT Actions, and MCP gates", async () => {
    const dto = await loadAdminMemoryVerification({ session, context: { userId: "u1", namespace: "real_life" }, repository: repo, env: { ...safeEnv, PANDORA_ENABLE_MODEL_CALLS: "true", PANDORA_ENABLE_EMBEDDINGS: "true", PANDORA_ENABLE_SEMANTIC_RETRIEVAL: "true", PANDORA_ENABLE_GPT_ACTIONS: "true", PANDORA_ENABLE_MCP: "true" } });
    expect(dto.unsafeGateStatus.status).toBe("blocked");
    expect(dto.unsafeGateStatus.enabledDangerousGates.join(" ")).toEqual(expect.stringContaining("PANDORA_ENABLE_MODEL_CALLS"));
    expect(dto.unsafeGateStatus.enabledDangerousGates.join(" ")).toEqual(expect.stringContaining("PANDORA_ENABLE_EMBEDDINGS"));
    expect(dto.unsafeGateStatus.enabledDangerousGates.join(" ")).toEqual(expect.stringContaining("PANDORA_ENABLE_SEMANTIC_RETRIEVAL"));
    expect(dto.unsafeGateStatus.enabledDangerousGates.join(" ")).toEqual(expect.stringContaining("PANDORA_ENABLE_GPT_ACTIONS"));
    expect(dto.unsafeGateStatus.enabledDangerousGates.join(" ")).toEqual(expect.stringContaining("PANDORA_ENABLE_MCP"));
    expect(dto.recommendation.closeRecommended).toBe(false);
  });

  it("blocks closure when admin persistence console, approved persistence, operator QA, or public persistence gates are enabled", async () => {
    const dto = await loadAdminMemoryVerification({ session, context: { userId: "u1", namespace: "real_life" }, repository: repo, env: { ...safeEnv, PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE: "true", PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE: "true", PANDORA_ENABLE_OPERATOR_MEMORY_QA_FLOW: "true", PANDORA_ENABLE_PUBLIC_MEMORY_PERSISTENCE: "true" } });
    expect(dto.unsafeGateStatus.status).toBe("blocked");
    expect(dto.unsafeGateStatus.enabledDangerousGates.join(" ")).toEqual(expect.stringContaining("PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE"));
    expect(dto.unsafeGateStatus.enabledDangerousGates.join(" ")).toEqual(expect.stringContaining("PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE"));
    expect(dto.unsafeGateStatus.enabledDangerousGates.join(" ")).toEqual(expect.stringContaining("PANDORA_ENABLE_OPERATOR_MEMORY_QA_FLOW"));
    expect(dto.unsafeGateStatus.enabledDangerousGates.join(" ")).toEqual(expect.stringContaining("PANDORA_ENABLE_PUBLIC_MEMORY_PERSISTENCE"));
    expect(dto.recommendation.closeRecommended).toBe(false);
  });

  it("documents consistent read-only route guard expectations", () => {
    expect(adminMemoryRouteGuardExpectations).toHaveLength(3);
    for (const guard of adminMemoryRouteGuardExpectations) {
      expect(guard.authenticatedSupabaseSessionRequired).toBe(true);
      expect(guard.adminOnly).toBe(true);
      expect(guard.readOnly).toBe(true);
      expect(guard.namespaceScoped).toBe(true);
      expect(guard.serverDerivedUserOnly).toBe(true);
      expect(guard.publicReadAllowed).toBe(false);
      expect(guard.serviceRoleAllowed).toBe(false);
      expect(guard.mutationAllowed).toBe(false);
    }
  });

  it("keeps public route as redirect-only and avoids public proof/audit routes", () => {
    const publicPage = readFileSync(join(root, "app/memory/browser/page.tsx"), "utf8");
    expect(publicPage).toContain('redirect("/admin/memory/browser?namespace=real_life")');
    expect(publicPage).not.toMatch(/SupabasePersistedMemoryReadRepository|loadPersistedMemoryBrowserView|memory_items|audit_logs|listMemory/i);
    expect(existsSync(join(root, "app/memory/audit/page.tsx"))).toBe(false);
    expect(existsSync(join(root, "app/memory/proof/page.tsx"))).toBe(false);
    expect(existsSync(join(root, "app/api/memory/browser/route.ts"))).toBe(false);
    expect(existsSync(join(root, "app/api/memory/audit/route.ts"))).toBe(false);
  });

  it("admin browser, audit, and verification routes are read-only and service-role-free", () => {
    const files = ["app/admin/memory/browser/page.tsx", "app/admin/memory/audit/page.tsx", "app/admin/memory/verification/page.tsx", "lib/services/admin-memory-verification-loader.ts", "lib/services/admin-memory-route-guard-contract.ts"];
    const text = files.map((f) => readFileSync(join(root, f), "utf8")).join("\n");
    expect(text).toMatch(/resolvePandoraServerSession/);
    expect(text).not.toMatch(/SUPABASE_SERVICE_ROLE|service-role|createServiceRole|service_role_key/i);
    expect(text).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(|executeApproved|persistApproved|appendReviewDecision/i);
    const imports = text.split("\n").filter((line) => line.startsWith("import ")).join("\n");
    expect(imports).not.toMatch(/openai|anthropic|embedding|pgvector|semantic|gpt-actions|mcp/i);
  });
});
