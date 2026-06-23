import type { PandoraNamespace } from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";

export type PandoraServerSessionBlocker = { code: "auth_required" | "namespace_required" | "client_user_id_rejected" | "namespace_not_allowed" | "session_unavailable"; message: string };
export type PandoraServerUser = { userId: string; email?: string; displayName?: string; authProvider?: string };
export type PandoraServerSession = PandoraServerUser & { authenticated: boolean; allowedNamespaces?: PandoraNamespace[]; adminCapabilities: string[]; isInternalOperator: boolean; isPersistenceOperator: boolean; sessionSource: "supabase" | "test" | "none"; serverDerivedOnly: true; clientUserIdAccepted: false; publicReadAllowed: false; publicPersistenceAllowed: false; serviceRoleUsed: false };
export type PandoraServerSessionResult = { ok: true; session: PandoraServerSession; blockers: [] } | { ok: false; session: null; blockers: PandoraServerSessionBlocker[] };
export type PandoraRepositoryContextFromSessionInput = { sessionResult: PandoraServerSessionResult; namespace?: string | null; requestId?: string };
export type PandoraRepositoryContextFromSessionResult = { ok: true; context: RepositoryContext; blockers: [] } | { ok: false; context: null; blockers: PandoraServerSessionBlocker[] };
