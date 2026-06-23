import { NextResponse, type NextRequest } from "next/server";
import type { PersistedMemoryReadRepository } from "@/lib/db/persisted-memory-read-repository-contract";
import type { PersistedMemoryNamespace } from "@/lib/services/persisted-memory-read-contract";
import { assertNoClientUserIdOverride, createRepositoryContextFromPandoraSession, resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import type { PandoraServerSessionResult } from "@/lib/auth/pandora-server-session-contract";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
export type PersistedMemoryReadAction = "listItems" | "getItem" | "listSources" | "getSource" | "listPatches" | "listAudit";
export type PersistedMemoryReadRouteDeps = { repository?: PersistedMemoryReadRepository; resolveSession?: (request: NextRequest) => Promise<PandoraServerSessionResult>; resolveAuth?: (request: NextRequest) => Promise<{ userId: string } | null>; resolveEnv?: () => { enabled?: boolean }; env?: () => Partial<NodeJS.ProcessEnv> };
const base = { ok: false, readOnly: true, wouldWrite: false, publicMemoryRead: false, requiresAuth: true };
const disabled = { ...base, message: "Authenticated persisted-memory read API is disabled by runtime gate." };
function reject(method: string) { return NextResponse.json({ ...disabled, message: `${method} is not allowed. Persisted memory read API is GET-only.` }, { status: 405, headers: { Allow: "GET" } }); }
export const rejectPersistedMemoryReadMutation = reject;
function req(url: URL) { const page = Number(url.searchParams.get("page") ?? 1); const pageSize = Number(url.searchParams.get("pageSize") ?? 25); const namespace = url.searchParams.get("namespace") as PersistedMemoryNamespace | null; const keyword = url.searchParams.get("keyword") ?? undefined; return { namespace, page, pageSize, filter: { keyword, itemId: url.searchParams.get("itemId") ?? undefined, sourceId: url.searchParams.get("sourceId") ?? undefined, reviewItemId: url.searchParams.get("reviewItemId") ?? undefined, decisionId: url.searchParams.get("decisionId") ?? undefined, createdFrom: url.searchParams.get("createdFrom") ?? undefined, createdTo: url.searchParams.get("createdTo") ?? undefined, memoryKind: url.searchParams.get("memoryKind") ?? undefined, category: url.searchParams.get("category") ?? undefined } }; }
export function createPersistedMemoryReadRouteHandler(deps: PersistedMemoryReadRouteDeps, action: PersistedMemoryReadAction) { return async function GET(request: NextRequest, ctx?: { params?: Promise<{ id?: string }> }) {
  const url = new URL(request.url); const rejected = await assertNoClientUserIdOverride(request); if (rejected) return NextResponse.json({ ...base, blockers: rejected.blockers, message: rejected.blockers[0].message }, { status: 400 });
  const gate = deps.resolveEnv ? deps.resolveEnv().enabled === true : resolvePandoraRuntimeSafetyConfig(deps.env?.()).config.persistedMemoryReadEnabled; if (!gate) return NextResponse.json(disabled, { status: 501 });
  const namespace = url.searchParams.get("namespace") as PersistedMemoryNamespace | null; if (!namespace) return NextResponse.json({ ...base, blockers: ["namespace_required"], message: "Namespace query param is required." }, { status: 400 });
  let repository = deps.repository;
  if (!repository) {
    try {
      const [{ createSupabaseServerClient }, { SupabasePersistedMemoryReadRepository }] = await Promise.all([import("@/lib/supabase/server"), import("@/lib/db/supabase-persisted-memory-read-repository")]);
      repository = new SupabasePersistedMemoryReadRepository(await createSupabaseServerClient() as never);
    } catch {
      return NextResponse.json({ ...disabled, message: "Read repository is unavailable." }, { status: 501 });
    }
  }
  const legacyAuth = deps.resolveAuth ? await deps.resolveAuth(request) : null;
  const session: PandoraServerSessionResult = deps.resolveSession ? await deps.resolveSession(request) : legacyAuth?.userId ? { ok: true, session: { userId: legacyAuth.userId, authenticated: true, adminCapabilities: [], isInternalOperator: false, isPersistenceOperator: false, sessionSource: "test", serverDerivedOnly: true, clientUserIdAccepted: false, publicReadAllowed: false, publicPersistenceAllowed: false, serviceRoleUsed: false }, blockers: [] } : deps.resolveAuth ? { ok: false, session: null, blockers: [{ code: "auth_required", message: "Authentication is required." }] } : await resolvePandoraServerSession({ request });
  if (!session.ok) return NextResponse.json({ ...base, blockers: session.blockers, message: session.blockers[0]?.message ?? "Authentication is required." }, { status: 403 });
  const context = createRepositoryContextFromPandoraSession({ sessionResult: session, namespace, requestId: request.headers.get("x-request-id") ?? undefined }); if (!context.ok) return NextResponse.json({ ...base, blockers: context.blockers, message: context.blockers[0].message }, { status: context.blockers[0].code === "namespace_required" ? 400 : 403 });
  const params = await ctx?.params; const listReq = req(url); const id = params?.id ?? url.searchParams.get("id") ?? "";
  const result = action === "listItems" ? await repository.listMemoryItems(context.context, { ...listReq, namespace }) : action === "getItem" ? await repository.getMemoryItemDetail(context.context, { namespace, id }) : action === "listSources" ? await repository.listMemorySources(context.context, { ...listReq, namespace }) : action === "getSource" ? await repository.getMemorySourceDetail(context.context, { namespace, id }) : action === "listPatches" ? await repository.listMemoryPatches(context.context, { ...listReq, namespace, filter: { ...listReq.filter, itemId: id } }) : await repository.listMemoryAuditEvents(context.context, { ...listReq, namespace, filter: { ...listReq.filter, itemId: id } });
  return NextResponse.json(result, { status: result.ok ? 200 : result.blocker.code === "not_found" ? 404 : 400 });
}; }
