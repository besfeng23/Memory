import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAdminMemoryVerification } from "@/lib/services/admin-memory-verification-loader";
import { adminMemoryRouteGuardExpectations } from "@/lib/services/admin-memory-route-guard-contract";
import type { PersistedMemoryReadRepository } from "@/lib/db/persisted-memory-read-repository-contract";

const root = process.cwd();
const okList = { ok: true as const, items: [], page: 1, pageSize: 25 };
const repo: PersistedMemoryReadRepository = {
  listMemoryItems: async () => okList,
  listMemorySources: async () => okList,
  listMemoryPatches: async () => okList,
  listMemoryAuditEvents: async () => okList,
  getMemoryItemDetail: async () => ({ ok: false, blocker: { code: "not_found", message: "not found" } }),
  getMemorySourceDetail: async () => ({ ok: false, blocker: { code: "not_found", message: "not found" } }),
};
const session = { ok: true as const, session: { userId: "u1", authenticated: true, allowedNamespaces: ["real_life"], serverDerivedOnly: true, clientUserIdAccepted: false, serviceRoleUsed: false, publicReadAllowed: false, publicPersistenceAllowed: false }, blockers: [] };

describe("admin memory verification safety", () => {
  it("builds a closure safety summary with public reads and unsafe writes disabled", async () => {
    const dto = await loadAdminMemoryVerification({ session, context: { userId: "u1", namespace: "real_life" }, repository: repo, env: { VERCEL_GIT_COMMIT_SHA: "abc123", PANDORA_SKILLS_COMMIT_SHA: "skills123" } });
    expect(dto.readOnly).toBe(true);
    expect(dto.publicReadStatus.status).toBe("disabled");
    expect(dto.unsafeGateStatus.status).toBe("disabled");
    expect(dto.recommendation.closeRecommended).toBe(true);
    expect(dto.checklist.map((i) => i.label)).toEqual(expect.arrayContaining(["Authenticated browser", "Public redirect", "Read-only behavior", "Audit proof availability", "Source/patch proof availability", "Skills commit proof availability"]));
  });

  it("blocks closure when public reads or unsafe writes are enabled", async () => {
    const dto = await loadAdminMemoryVerification({ session, context: { userId: "u1", namespace: "real_life" }, repository: repo, env: { VERCEL_GIT_COMMIT_SHA: "abc123", PANDORA_ENABLE_PUBLIC_MEMORY_READ: "true", PANDORA_ENABLE_MEMORY_INGEST_PRODUCTION_WRITES: "true" } });
    expect(dto.publicReadStatus.status).toBe("blocked");
    expect(dto.unsafeGateStatus.status).toBe("blocked");
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
