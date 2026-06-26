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
  getMemoryItemDetail: async () => ({
    ok: false,
    blocker: { code: "not_found", message: "not found" },
  }),
  getMemorySourceDetail: async () => ({
    ok: false,
    blocker: { code: "not_found", message: "not found" },
  }),
};
const throwingRepo: PersistedMemoryReadRepository = {
  listMemoryItems: async () => {
    throw new Error("read gate should block before repository access");
  },
  listMemorySources: async () => {
    throw new Error("read gate should block before repository access");
  },
  listMemoryPatches: async () => {
    throw new Error("read gate should block before repository access");
  },
  listMemoryAuditEvents: async () => {
    throw new Error("read gate should block before repository access");
  },
  getMemoryItemDetail: async () => {
    throw new Error("read gate should block before repository access");
  },
  getMemorySourceDetail: async () => {
    throw new Error("read gate should block before repository access");
  },
};
const session = {
  ok: true as const,
  session: {
    userId: "u1",
    authenticated: true,
    allowedNamespaces: ["real_life"],
    serverDerivedOnly: true,
    clientUserIdAccepted: false,
    serviceRoleUsed: false,
    publicReadAllowed: false,
    publicPersistenceAllowed: false,
  },
  blockers: [],
};
const safeEnv = {
  VERCEL_GIT_COMMIT_SHA: "abc123",
  PANDORA_SKILLS_COMMIT_SHA: "skills123",
  PANDORA_ENABLE_PERSISTED_MEMORY_READ: "true",
};
const riskGateEnvVars = [
  ["modelCallsEnabled", "PANDORA_ENABLE_MODEL_CALLS"],
  ["embeddingsEnabled", "PANDORA_ENABLE_EMBEDDINGS"],
  ["semanticRetrievalEnabled", "PANDORA_ENABLE_SEMANTIC_RETRIEVAL"],
  ["gptActionsEnabled", "PANDORA_ENABLE_GPT_ACTIONS"],
  ["mcpEnabled", "PANDORA_ENABLE_MCP"],
  [
    "adminPersistenceConsoleEnabled",
    "PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE",
  ],
  ["operatorQaFlowEnabled", "PANDORA_ENABLE_OPERATOR_MEMORY_QA_FLOW"],
  [
    "approvedReviewPersistenceEnabled",
    "PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE",
  ],
  [
    "ingestProductionWriteEnabled",
    "PANDORA_ENABLE_MEMORY_INGEST_PRODUCTION_WRITES",
  ],
  ["publicMemoryReadEnabled", "PANDORA_ENABLE_PUBLIC_MEMORY_READ"],
  [
    "publicMemoryPersistenceEnabled",
    "PANDORA_ENABLE_PUBLIC_MEMORY_PERSISTENCE",
  ],
] as const;

describe("admin memory verification safety", () => {
  it("builds a closure safety summary with public reads and risk gates disabled", async () => {
    const dto = await loadAdminMemoryVerification({
      session,
      context: { userId: "u1", namespace: "real_life" },
      repository: repo,
      env: safeEnv,
    });
    expect(dto.readOnly).toBe(true);
    expect(dto.persistedMemoryReadGateStatus.status).toBe("available");
    expect(dto.publicReadStatus.status).toBe("disabled");
    expect(dto.unsafeGateStatus.status).toBe("disabled");
    expect(dto.recommendation.closeRecommended).toBe(true);
    expect(dto.runtimeGateMatrix.map((i) => i.gateKey)).toEqual([
      "persistedMemoryReadEnabled",
      "adminPersistenceConsoleEnabled",
      "approvedReviewPersistenceEnabled",
      "operatorQaFlowEnabled",
      "ingestProductionWriteEnabled",
      "publicMemoryReadEnabled",
      "publicMemoryPersistenceEnabled",
      "modelCallsEnabled",
      "embeddingsEnabled",
      "semanticRetrievalEnabled",
      "gptActionsEnabled",
      "mcpEnabled",
    ]);
    expect(
      dto.runtimeGateMatrix.find(
        (i) => i.gateKey === "persistedMemoryReadEnabled",
      )?.dangerous,
    ).toBe(false);
    expect(
      dto.runtimeGateMatrix
        .filter((i) => i.gateKey !== "persistedMemoryReadEnabled")
        .every((i) => i.dangerous),
    ).toBe(true);
    expect(dto.closureStatus.map((i) => i.label)).toContain(
      "Final close/no-close decision",
    );
    expect(dto.checklist.map((i) => i.label)).toEqual(
      expect.arrayContaining([
        "Authenticated verification",
        "Authenticated browser",
        "Authenticated audit",
        "Public redirect",
        "No public persisted rows render",
        "No mutation controls exist",
        "Persisted read gate",
        "Audit proof availability",
        "Source/patch proof availability",
        "Skills commit proof availability",
      ]),
    );
  });

  it("does not override the persisted memory read gate", async () => {
    const dto = await loadAdminMemoryVerification({
      session,
      context: { userId: "u1", namespace: "real_life" },
      repository: throwingRepo,
      env: { VERCEL_GIT_COMMIT_SHA: "abc123" },
    });
    expect(dto.persistedMemoryReadGateStatus.status).toBe("disabled");
    expect(dto.supabaseReadAvailability.status).toBe("disabled");
    expect(dto.supabaseReadAvailability.detail).toContain("did not override");
    expect(dto.recommendation.closeRecommended).toBe(false);
  });

  it("blocks closure when public reads or write persistence gates are enabled", async () => {
    const dto = await loadAdminMemoryVerification({
      session,
      context: { userId: "u1", namespace: "real_life" },
      repository: repo,
      env: {
        ...safeEnv,
        PANDORA_ENABLE_PUBLIC_MEMORY_READ: "true",
        PANDORA_ENABLE_MEMORY_INGEST_PRODUCTION_WRITES: "true",
      },
    });
    expect(dto.publicReadStatus.status).toBe("blocked");
    expect(dto.unsafeGateStatus.status).toBe("blocked");
    expect(dto.unsafeGateStatus.detail).toContain("publicMemoryReadEnabled");
    expect(dto.unsafeGateStatus.detail).toContain(
      "ingestProductionWriteEnabled",
    );
    expect(dto.recommendation.closeRecommended).toBe(false);
  });

  it("blocks closure when any dangerous runtime gate is enabled and names exact gates", async () => {
    for (const [gateName, envVar] of riskGateEnvVars) {
      const dto = await loadAdminMemoryVerification({
        session,
        context: { userId: "u1", namespace: "real_life" },
        repository: repo,
        env: { ...safeEnv, [envVar]: "true" },
      });
      expect(dto.unsafeGateStatus.status).toBe("blocked");
      expect(dto.unsafeGateStatus.detail).toContain(gateName);
      expect(dto.recommendation.closeRecommended).toBe(false);
      expect(dto.recommendation.blockers.join(" ")).toContain(gateName);
    }
  });

  it("blocks closure when auth is missing", async () => {
    const noSession = {
      ok: false as const,
      blockers: [{ code: "auth_required", message: "auth required" }],
    };
    const dto = await loadAdminMemoryVerification({
      session: noSession,
      context: { namespace: "real_life" },
      repository: throwingRepo,
      env: safeEnv,
    });
    expect(dto.recommendation.closeRecommended).toBe(false);
    expect(dto.recommendation.blockers).toEqual(
      expect.arrayContaining([
        "operator session missing",
        "Supabase read proof unavailable: blocked",
        "browser/audit route status requires authenticated read proof",
      ]),
    );
  });

  it("blocks closure when commit proof is missing", async () => {
    const dto = await loadAdminMemoryVerification({
      session,
      context: { userId: "u1", namespace: "real_life" },
      repository: repo,
      env: { PANDORA_ENABLE_PERSISTED_MEMORY_READ: "true" },
    });
    expect(dto.commitSha.status).toBe("not configured");
    expect(dto.recommendation.closeRecommended).toBe(false);
    expect(dto.recommendation.blockers).toContain("commit proof missing");
  });

  it("blocks closure when persisted read gate is disabled and names it", async () => {
    const dto = await loadAdminMemoryVerification({
      session,
      context: { userId: "u1", namespace: "real_life" },
      repository: throwingRepo,
      env: { VERCEL_GIT_COMMIT_SHA: "abc123" },
    });
    expect(dto.recommendation.blockers).toEqual(
      expect.arrayContaining([
        "persisted read gate disabled",
        "Supabase read proof unavailable: disabled",
        "browser/audit route status requires authenticated read proof",
      ]),
    );
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
    const publicPage = readFileSync(
      join(root, "app/memory/browser/page.tsx"),
      "utf8",
    );
    expect(publicPage).toContain(
      'redirect("/admin/memory/browser?namespace=real_life")',
    );
    expect(publicPage).not.toMatch(
      /SupabasePersistedMemoryReadRepository|loadPersistedMemoryBrowserView|memory_items|audit_logs|listMemory/i,
    );
    expect(existsSync(join(root, "app/memory/audit/page.tsx"))).toBe(false);
    expect(existsSync(join(root, "app/memory/proof/page.tsx"))).toBe(false);
    expect(existsSync(join(root, "app/api/memory/browser/route.ts"))).toBe(
      false,
    );
    expect(existsSync(join(root, "app/api/memory/audit/route.ts"))).toBe(false);
  });

  it("admin browser, audit, and verification routes are read-only and service-role-free", () => {
    const files = [
      "app/admin/memory/browser/page.tsx",
      "app/admin/memory/audit/page.tsx",
      "app/admin/memory/verification/page.tsx",
      "lib/services/admin-memory-verification-loader.ts",
      "lib/services/admin-memory-route-guard-contract.ts",
    ];
    const text = files
      .map((f) => readFileSync(join(root, f), "utf8"))
      .join("\n");
    expect(text).toMatch(/resolvePandoraServerSession/);
    expect(text).not.toMatch(
      /SUPABASE_SERVICE_ROLE|service-role|createServiceRole|service_role_key/i,
    );
    expect(text).not.toMatch(
      /\.insert\(|\.update\(|\.delete\(|\.upsert\(|executeApproved|persistApproved|appendReviewDecision/i,
    );
    const imports = text
      .split("\n")
      .filter((line) => line.startsWith("import "))
      .join("\n");
    expect(imports).not.toMatch(
      /openai|anthropic|embedding|pgvector|semantic|gpt-actions|mcp/i,
    );
  });
});
