import { NextResponse, type NextRequest } from "next/server";
import type { PersistedMemoryReadRepository } from "@/lib/db/persisted-memory-read-repository-contract";
import type { PersistedMemoryNamespace, PersistedMemoryReadContext } from "@/lib/services/persisted-memory-read-contract";

export type PersistedMemoryReadAction = "listItems" | "getItem" | "listSources" | "getSource" | "listPatches" | "listAudit";
export type PersistedMemoryReadRouteDeps = { repository?: PersistedMemoryReadRepository; resolveAuth?: (request: NextRequest) => Promise<{ userId: string } | null>; resolveEnv?: () => { enabled?: boolean }; dtoMapper?: unknown };
const disabled = { ok: false, readOnly: true, wouldWrite: false, publicMemoryRead: false, requiresAuth: true, message: "Authenticated persisted-memory read API is not wired in production defaults." };
function reject(method: string) { return NextResponse.json({ ...disabled, message: `${method} is not allowed. Persisted memory read API is GET-only.` }, { status: 405, headers: { Allow: "GET" } }); }
export const rejectPersistedMemoryReadMutation = reject;
function hasClientUserId(url: URL) { return url.searchParams.has("user_id") || url.searchParams.has("userId") || url.searchParams.has("client_user_id") || url.searchParams.has("clientUserId"); }
function req(url: URL) { const page = Number(url.searchParams.get("page") ?? 1); const pageSize = Number(url.searchParams.get("pageSize") ?? 25); const namespace = url.searchParams.get("namespace") as PersistedMemoryNamespace | null; const keyword = url.searchParams.get("keyword") ?? undefined; return { namespace, page, pageSize, filter: { keyword, itemId: url.searchParams.get("itemId") ?? undefined, sourceId: url.searchParams.get("sourceId") ?? undefined, reviewItemId: url.searchParams.get("reviewItemId") ?? undefined, decisionId: url.searchParams.get("decisionId") ?? undefined, createdFrom: url.searchParams.get("createdFrom") ?? undefined, createdTo: url.searchParams.get("createdTo") ?? undefined, memoryKind: url.searchParams.get("memoryKind") ?? undefined, category: url.searchParams.get("category") ?? undefined } }; }
export function createPersistedMemoryReadRouteHandler(deps: PersistedMemoryReadRouteDeps, action: PersistedMemoryReadAction) {
  return async function GET(request: NextRequest, ctx?: { params?: Promise<{ id?: string }> }) {
    const url = new URL(request.url);
    if (hasClientUserId(url)) return NextResponse.json({ ...disabled, message: "Client-supplied user_id/userId is rejected." }, { status: 400 });
    const namespace = url.searchParams.get("namespace") as PersistedMemoryNamespace | null;
    if (!namespace) return NextResponse.json({ ...disabled, message: "Namespace query param is required." }, { status: 400 });
    if (!deps.resolveAuth || !deps.repository || deps.resolveEnv?.().enabled !== true) return NextResponse.json(disabled, { status: 501 });
    const auth = await deps.resolveAuth(request); if (!auth?.userId) return NextResponse.json({ ...disabled, message: "Authentication is required." }, { status: 403 });
    const params = await ctx?.params; const context: PersistedMemoryReadContext = { userId: auth.userId, namespace };
    const listReq = req(url); const id = params?.id ?? url.searchParams.get("id") ?? "";
    const result = action === "listItems" ? await deps.repository.listMemoryItems(context, { ...listReq, namespace }) : action === "getItem" ? await deps.repository.getMemoryItemDetail(context, { namespace, id }) : action === "listSources" ? await deps.repository.listMemorySources(context, { ...listReq, namespace }) : action === "getSource" ? await deps.repository.getMemorySourceDetail(context, { namespace, id }) : action === "listPatches" ? await deps.repository.listMemoryPatches(context, { ...listReq, namespace, filter: { ...listReq.filter, itemId: id } }) : await deps.repository.listMemoryAuditEvents(context, { ...listReq, namespace, filter: { ...listReq.filter, itemId: id } });
    return NextResponse.json(result, { status: result.ok ? 200 : result.blocker.code === "not_found" ? 404 : 400 });
  };
}
