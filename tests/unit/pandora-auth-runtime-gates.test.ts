import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { assertNoClientUserIdOverride, createRepositoryContextFromPandoraSession, resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { createPersistedMemoryReadRouteHandler, rejectPersistedMemoryReadMutation } from "@/lib/api/persisted-memory-read-route-handler";
import { loadPersistedMemoryBrowserView } from "@/lib/services/persisted-memory-browser-loader";

describe("pandora server session and runtime gates", () => {
  it("rejects client user_id/userId and returns unauthenticated blockers without auth", async () => {
    await expect(assertNoClientUserIdOverride(new NextRequest("http://x.test?user_id=evil"))).resolves.toMatchObject({ ok: false });
    await expect(assertNoClientUserIdOverride(new NextRequest("http://x.test"), { userId: "evil" })).resolves.toMatchObject({ ok: false });
    await expect(resolvePandoraServerSession()).resolves.toMatchObject({ ok: false, blockers: expect.arrayContaining([expect.objectContaining({ code: "auth_required" })]) });
  });
  it("creates repository context only from server session and validates namespace", () => {
    const sessionResult = { ok: true as const, blockers: [], session: { userId: "u1", authenticated: true, allowedNamespaces: ["real_life" as const], adminCapabilities: [], isInternalOperator: false, isPersistenceOperator: false, sessionSource: "test" as const, serverDerivedOnly: true as const, clientUserIdAccepted: false as const, publicReadAllowed: false as const, publicPersistenceAllowed: false as const, serviceRoleUsed: false as const } };
    expect(createRepositoryContextFromPandoraSession({ sessionResult, namespace: "real_life" })).toMatchObject({ ok: true, context: { userId: "u1" } });
    expect(createRepositoryContextFromPandoraSession({ sessionResult, namespace: "au" })).toMatchObject({ ok: false });
    expect(createRepositoryContextFromPandoraSession({ sessionResult: { ok: false, session: null, blockers: [{ code: "auth_required", message: "no" }] }, namespace: "real_life" })).toMatchObject({ ok: false });
  });
  it("defaults dangerous runtime gates false", () => { const r = resolvePandoraRuntimeSafetyConfig({}); expect(Object.entries(r.config).every(([key, v]) => key === "sensitiveMemoryRequiresApproval" ? v === true : v === false)).toBe(true); });
  it("persisted read route blocks disabled gate, auth, namespace, client override, and mutations", async () => {
    const mk = (deps: Parameters<typeof createPersistedMemoryReadRouteHandler>[0]) => createPersistedMemoryReadRouteHandler({ ...deps, repository: deps.repository ?? { listMemoryItems: async () => ({ ok: true, items: [], page: 1, pageSize: 25, readOnly: true, wouldWrite: false, wouldCallModel: false, wouldEmbed: false, semanticRetrievalEnabled: false, requiresAuth: true, namespaceScoped: true }) } }, "listItems");
    expect((await mk({ env: () => ({}) })(new NextRequest("http://x.test?namespace=real_life"))).status).toBe(501);
    expect((await mk({ resolveEnv: () => ({ enabled: true }), resolveSession: async () => ({ ok: false, session: null, blockers: [{ code: "auth_required", message: "auth" }] }) })(new NextRequest("http://x.test?namespace=real_life"))).status).toBe(403);
    expect((await mk({ resolveEnv: () => ({ enabled: true }) })(new NextRequest("http://x.test"))).status).toBe(400);
    expect((await mk({ resolveEnv: () => ({ enabled: true }) })(new NextRequest("http://x.test?namespace=real_life&userId=evil"))).status).toBe(400);
    expect((await rejectPersistedMemoryReadMutation("POST")).status).toBe(405);
  });
  it("memory browser exposes disabled/auth/namespace states without fake data", async () => {
    await expect(loadPersistedMemoryBrowserView({ runtime: resolvePandoraRuntimeSafetyConfig({}) })).resolves.toMatchObject({ empty: true, blockers: [{ code: "read_error" }], items: [] });
    const runtime = resolvePandoraRuntimeSafetyConfig({ PANDORA_ENABLE_PERSISTED_MEMORY_READ: "true" });
    await expect(loadPersistedMemoryBrowserView({ runtime, context: { namespace: "real_life" } })).resolves.toMatchObject({ blockers: [{ code: "auth_required" }], items: [] });
    await expect(loadPersistedMemoryBrowserView({ runtime, context: { userId: "u1" } })).resolves.toMatchObject({ blockers: [{ code: "namespace_required" }], items: [] });
  });
});
