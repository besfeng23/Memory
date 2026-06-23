import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveAdminPersistencePermission } from "@/lib/security/admin-persistence-permissions";
import { createAdminPersistenceExecutionRouteHandler } from "@/lib/api/admin-persistence-execution-route-handler";
import { toReviewItemSafeDto, toPreviewSafeDto } from "@/lib/api/admin-persistence-console-dto";
import { buildApprovedReviewPersistenceAuditSummary } from "@/lib/services/approved-review-persistence-audit-contract";
import AdminPage from "@/app/admin/memory/persistence/page";
import { POST as previewPost } from "@/app/api/admin/memory/persistence/review/[id]/preview/route";
import { POST as executePost } from "@/app/api/admin/memory/persistence/review/[id]/execute/route";
import fs from "node:fs/promises";

const context = { userId: "user-1", namespace: "real_life" as const, requestId: "req" };
function item(overrides = {}) { return { id: "review-1", status: "approved_for_append", userId: "user-1", namespace: "real_life", extractedCandidateId: "cand-1", candidateType: "preference", normalizedText: "secret ".repeat(40), evidence: { spans: [], spanRanges: [{ start: 0, end: 6 }], hasEvidence: true }, sensitivity: { level: "low", requiresSensitiveReview: false, resolved: true }, requiresReview: true, appendOnly: true, proposedOperation: "append", sourceMetadata: { sourceType: "conversation", capturedAt: "2026-06-23T00:00:00.000Z" }, namespaceIsolation: { namespace: "real_life", classification: "real_life", auOnly: false, realLifeOnly: true, explicitlyFictionalized: false, mixedContent: false, realLifeCannotConsumeAuEvidence: true, auContentCannotBecomeRealLifeEvidence: true }, blockers: [], warnings: [], createdAt: "2026-06-23T00:00:00.000Z", updatedAt: "2026-06-23T00:00:00.000Z", audit: { createdByUserId: "user-1", updatedByUserId: "user-1", createdFrom: "contract_test", decisionTrail: [] }, ...overrides } as never; }
const env = () => ({ PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE: "true", PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE: "true" }) as NodeJS.ProcessEnv;
const repo = (row = item()) => ({ listReviewQueueItems: vi.fn(async () => ({ ok: true, data: [row] })), readReviewQueueItemById: vi.fn(async () => ({ ok: true, data: row })) });
const req = (body: unknown = { namespace: "real_life" }, headers = {}) => new NextRequest("https://x.test/admin", { method: "POST", body: JSON.stringify(body), headers: { "x-pandora-internal-persistence-mode": "approved-review-executor", ...headers } });

describe("admin persistence permissions", () => {
  it("blocks by default and requires env, console flag, internal/admin capability, namespace, and no client user_id", () => {
    expect(resolveAdminPersistencePermission({}).blockers).toEqual(expect.arrayContaining(["missing_authenticated_server_user", "persistence_env_flag_disabled", "admin_console_env_flag_disabled", "missing_internal_admin_capability", "missing_namespace", "public_execution_route"]));
    expect(resolveAdminPersistencePermission({ context, env: { PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE: "true" }, routeContext: "admin", headers: new Headers({ "x-pandora-internal-persistence-mode": "approved-review-executor" }) }).blockers).toContain("admin_console_env_flag_disabled");
    expect(resolveAdminPersistencePermission({ context, env: env(), routeContext: "admin", user_id: "evil", adminCapability: true }).blockers).toContain("client_user_id_override_attempt");
    expect(resolveAdminPersistencePermission({ context, env: env(), routeContext: "admin", headers: new Headers({ "x-pandora-internal-persistence-mode": "approved-review-executor" }) }).allowed).toBe(true);
  });
});

describe("admin route factory", () => {
  it("blocks without auth, namespace, and non-approved review items", async () => {
    expect([400, 401]).toContain((await createAdminPersistenceExecutionRouteHandler({ enabled: true, resolveAuth: async () => null, reviewQueueRepository: repo() as never, env }).preview(req(), { params: Promise.resolve({ id: "review-1" }) })).status);
    expect((await createAdminPersistenceExecutionRouteHandler({ enabled: true, resolveAuth: async () => ({ userId: "user-1" }), reviewQueueRepository: repo() as never, env }).preview(req({}), { params: Promise.resolve({ id: "review-1" }) })).status).toBe(400);
    expect((await createAdminPersistenceExecutionRouteHandler({ enabled: true, resolveAuth: async () => ({ userId: "user-1" }), reviewQueueRepository: repo(item({ status: "pending_review" })) as never, env }).preview(req(), { params: Promise.resolve({ id: "review-1" }) })).status).toBe(403);
  });
  it("previews safely and execution requires idempotency, gate, and injected executor", async () => {
    const executor = vi.fn(async () => ({ executed: true, blockers: [], appendOnly: true }));
    const fakePreview = () => ({ ok: true, previewOnly: true, approvedReviewItemIsNotMemory: true, futureGatedPersistenceRequired: true, wouldPersist: false, wouldCallModel: false, wouldEmbed: false, productionWriteDisabled: true, requiresFutureInternalGate: true, plans: [], blockers: [], warnings: [], summary: {} as never });
    const handler = createAdminPersistenceExecutionRouteHandler({ enabled: true, resolveAuth: async () => ({ userId: "user-1" }), reviewQueueRepository: repo() as never, persistenceRepository: {} as never, previewService: fakePreview as never, executorService: executor as never, env });
    expect(await (await handler.preview(req(), { params: Promise.resolve({ id: "review-1" }) })).json()).toMatchObject({ preview: { wouldPersist: false, requiresInternalGate: true } });
    expect((await handler.execute(req(), { params: Promise.resolve({ id: "review-1" }) })).status).toBe(400);
    expect((await handler.execute(req({ namespace: "real_life", idempotencyKey: "idem" }), { params: Promise.resolve({ id: "review-1" }) })).status).toBe(200);
  });
  it("rejects client user_id", async () => {
    const res = await createAdminPersistenceExecutionRouteHandler({ enabled: true, resolveAuth: async () => ({ userId: "user-1" }), reviewQueueRepository: repo() as never, env }).list(new NextRequest("https://x.test/admin?user_id=evil", { method: "POST", body: "{}" }), { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });
});

describe("public admin stubs, UI, DTOs, audit, and static safety", () => {
  it("public admin routes are disabled by default", async () => {
    expect((await previewPost(new NextRequest("https://x.test", { method: "POST", body: "{}" }))).status).toBe(501);
    expect((await executePost(new NextRequest("https://x.test", { method: "POST", body: "{}" }))).status).toBe(501);
  });
  it("admin UI shows disabled execution copy", () => {
    const html = renderToStaticMarkup(AdminPage());
    expect(html).toContain("Execution is internal/admin-gated."); expect(html).toContain("Public production persistence is disabled."); expect(html).toContain("AU/story memory cannot become real-life evidence."); expect(html).toContain("disabled");
  });
  it("DTOs redact candidate content and include safety booleans", () => {
    const dto = toReviewItemSafeDto(item(), 12); expect(dto.candidatePreview.length).toBe(12); expect(dto.publicPersistenceEnabled).toBe(false); expect(toPreviewSafeDto({ ok: true, previewOnly: true, approvedReviewItemIsNotMemory: true, futureGatedPersistenceRequired: true, wouldPersist: false, wouldCallModel: false, wouldEmbed: false, productionWriteDisabled: true, requiresFutureInternalGate: true, plans: [], blockers: [], warnings: [], summary: {} as never }).requiresInternalGate).toBe(true);
  });
  it("audit summary requires core fields", () => {
    expect(() => buildApprovedReviewPersistenceAuditSummary({})).toThrow("missing_userId");
    expect(buildApprovedReviewPersistenceAuditSummary({ userId: "u", namespace: "real_life", reviewItemId: "r", decisionId: "d", idempotencyKey: "i", previewFingerprint: "p" })).toMatchObject({ appendOnly: true, auditReady: true });
  });
  it("contains no forbidden public-route imports and ingest remains disabled", async () => {
    const pub = await fs.readFile("app/api/admin/memory/persistence/review/[id]/execute/route.ts", "utf8"); expect(pub).not.toMatch(/service-role|supabase|openai|model|retrieval|vector|pgvector|GPT Actions|MCP/i);
    const ingest = await fs.readFile("lib/api/memory-ingest-route-handler.ts", "utf8"); expect(ingest).toMatch(/productionRouteEnabled: false|productionWriteEnabled: false|production/i);
    const factory = await fs.readFile("lib/api/admin-persistence-execution-route-handler.ts", "utf8"); expect(factory).toContain("resolveAdminPersistencePermission");
  });
});
