import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security/auth";
import type { PandoraNamespace } from "@/lib/supabase/database.types";
import { createRepositoryContext } from "@/lib/db/repository-context";
import type { PandoraRepositoryContextFromSessionInput, PandoraRepositoryContextFromSessionResult, PandoraServerSession, PandoraServerSessionResult } from "@/lib/auth/pandora-server-session-contract";

const USER_ID_KEYS = ["user_id", "userId", "client_user_id", "clientUserId"];
const isNs = (v?: string | null): v is PandoraNamespace => v === "real_life" || v === "au";
export async function assertNoClientUserIdOverride(request?: NextRequest | Request | URL | null, body?: unknown): Promise<PandoraServerSessionResult | null> {
  const url = request instanceof URL ? request : request ? new URL(request.url) : null;
  if (url && USER_ID_KEYS.some((k) => url.searchParams.has(k))) return { ok: false, session: null, blockers: [{ code: "client_user_id_rejected", message: "Client-supplied user_id/userId is rejected; user identity must be server-derived." }] };
  const obj = body && typeof body === "object" ? body as Record<string, unknown> : null;
  if (obj && USER_ID_KEYS.some((k) => Object.prototype.hasOwnProperty.call(obj, k))) return { ok: false, session: null, blockers: [{ code: "client_user_id_rejected", message: "Client-supplied user_id/userId is rejected; user identity must be server-derived." }] };
  return null;
}
export async function resolvePandoraServerSession(input: { request?: NextRequest | Request; testSession?: PandoraServerSession | null } = {}): Promise<PandoraServerSessionResult> {
  const rejected = await assertNoClientUserIdOverride(input.request); if (rejected) return rejected;
  if (input.testSession) return { ok: true, session: { ...input.testSession, serverDerivedOnly: true, clientUserIdAccepted: false, serviceRoleUsed: false }, blockers: [] };
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, session: null, blockers: [{ code: "auth_required", message: "Authenticated server session is required." }, { code: "session_unavailable", message: "No real auth provider session was resolved; no production user is faked." }] };
  const session: PandoraServerSession = { userId: user.id, email: user.email, displayName: user.user_metadata?.name ?? user.user_metadata?.full_name, authProvider: user.app_metadata?.provider, authenticated: true, allowedNamespaces: ["real_life", "au"], adminCapabilities: Array.isArray(user.app_metadata?.adminCapabilities) ? user.app_metadata.adminCapabilities : Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : [], isInternalOperator: user.app_metadata?.role === "admin" || user.app_metadata?.role === "operator" || user.app_metadata?.isInternalOperator === true, isPersistenceOperator: user.app_metadata?.isPersistenceOperator === true || user.app_metadata?.role === "persistence_operator", sessionSource: "supabase", serverDerivedOnly: true, clientUserIdAccepted: false, publicReadAllowed: false, publicPersistenceAllowed: false, serviceRoleUsed: false };
  return { ok: true, session, blockers: [] };
}
export function createRepositoryContextFromPandoraSession(input: PandoraRepositoryContextFromSessionInput): PandoraRepositoryContextFromSessionResult {
  if (!input.sessionResult.ok) return { ok: false, context: null, blockers: input.sessionResult.blockers };
  if (!isNs(input.namespace)) return { ok: false, context: null, blockers: [{ code: "namespace_required", message: "Explicit valid namespace is required." }] };
  const allowed = input.sessionResult.session.allowedNamespaces;
  if (allowed && !allowed.includes(input.namespace)) return { ok: false, context: null, blockers: [{ code: "namespace_not_allowed", message: "Namespace is not allowed for this server session." }] };
  const ctx = createRepositoryContext({ userId: input.sessionResult.session.userId, namespace: input.namespace, requestId: input.requestId });
  return ctx.ok ? { ok: true, context: ctx.data, blockers: [] } : { ok: false, context: null, blockers: [{ code: "auth_required", message: ctx.error.message }] };
}
