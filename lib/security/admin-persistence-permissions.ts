import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryNamespace } from "@/lib/services/memory-extraction-contract";

export type AdminPersistencePermissionBlocker =
  | "missing_authenticated_server_user" | "missing_internal_admin_capability" | "persistence_env_flag_disabled"
  | "admin_console_env_flag_disabled" | "client_user_id_override_attempt" | "missing_namespace"
  | "public_execution_route";

export type AdminPersistencePermissionInput = {
  context?: Pick<RepositoryContext, "userId" | "namespace"> | null;
  namespace?: MemoryNamespace | null;
  env?: { PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE?: string; PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE?: string };
  headers?: Headers | Record<string, string | undefined> | null;
  adminCapability?: boolean | "approved-review-executor";
  routeContext?: "public" | "internal" | "admin" | "test";
  clientUserId?: unknown; client_user_id?: unknown; userId?: unknown; user_id?: unknown;
};
export type AdminPersistencePermissionResult = { allowed: boolean; blockers: AdminPersistencePermissionBlocker[]; requiresInternalGate: true; publicPersistenceEnabled: false; productionIngestEnabled: false; namespace?: MemoryNamespace };

function header(input: AdminPersistencePermissionInput, name: string) { if (!input.headers) return undefined; return input.headers instanceof Headers ? input.headers.get(name) ?? undefined : input.headers[name] ?? input.headers[name.toLowerCase()]; }
export function resolveAdminPersistencePermission(input: AdminPersistencePermissionInput): AdminPersistencePermissionResult {
  const blockers: AdminPersistencePermissionBlocker[] = [];
  const namespace = input.namespace ?? input.context?.namespace;
  if (!input.context?.userId) blockers.push("missing_authenticated_server_user");
  if (input.env?.PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE !== "true") blockers.push("persistence_env_flag_disabled");
  if (input.env?.PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE !== "true") blockers.push("admin_console_env_flag_disabled");
  const capable = input.adminCapability === true || input.adminCapability === "approved-review-executor" || header(input, "x-pandora-internal-persistence-mode") === "approved-review-executor";
  if (!capable) blockers.push("missing_internal_admin_capability");
  if (input.clientUserId || input.client_user_id || input.userId || input.user_id) blockers.push("client_user_id_override_attempt");
  if (!namespace) blockers.push("missing_namespace");
  if (!input.routeContext || input.routeContext === "public") blockers.push("public_execution_route");
  return { allowed: blockers.length === 0, blockers, requiresInternalGate: true, publicPersistenceEnabled: false, productionIngestEnabled: false, namespace: namespace ?? undefined };
}
