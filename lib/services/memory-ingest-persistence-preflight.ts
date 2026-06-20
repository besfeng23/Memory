import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { PandoraNamespace } from "@/lib/supabase/database.types";

export type MemoryIngestRequiredWriteTarget = "memory_items" | "memory_sources" | "memory_patches" | "audit_logs";

export type MemoryIngestNamespaceIsolationPolicy = {
  namespace: PandoraNamespace;
  noCrossNamespacePersistence: true;
  realLifeCannotConsumeAuEvidence: true;
  auContentRemainsFictionalStoryScoped: true;
};

export type MemoryIngestPersistencePreflightResult = {
  status: "ready" | "blocked";
  namespace: PandoraNamespace;
  userId: string;
  wouldPersist: false;
  wouldUseAppendOnlyPatch: true;
  wouldValidateNamespaceIsolation: true;
  wouldCreateAuditLog: true;
  wouldCreateRetrievalLog: false;
  wouldCallModel: false;
  wouldUseClientUserId: false;
  requiredWriteTargets: MemoryIngestRequiredWriteTarget[];
  blockers: string[];
  warnings: string[];
  requestHash: string | null;
  fingerprint: string | null;
  namespaceIsolation: MemoryIngestNamespaceIsolationPolicy;
};

export type MemoryIngestPersistencePreflightInput = {
  context: RepositoryContext;
  request: FutureMemoryIngestRequest;
  requestHash?: string | null;
  fingerprint?: string | null;
  dryRunMetadata?: Record<string, unknown>;
};

const REQUIRED_WRITE_TARGETS: MemoryIngestRequiredWriteTarget[] = [
  "memory_items",
  "memory_sources",
  "memory_patches",
  "audit_logs",
];

function buildNamespaceIsolationPolicy(namespace: PandoraNamespace): MemoryIngestNamespaceIsolationPolicy {
  return {
    namespace,
    noCrossNamespacePersistence: true,
    realLifeCannotConsumeAuEvidence: true,
    auContentRemainsFictionalStoryScoped: true,
  };
}

function hasClientSuppliedUserId(request: FutureMemoryIngestRequest): boolean {
  return Object.prototype.hasOwnProperty.call(request.metadata, "user_id") || Object.prototype.hasOwnProperty.call(request.metadata, "userId");
}

export async function runMemoryIngestPersistencePreflight(
  input: MemoryIngestPersistencePreflightInput,
): Promise<RepositoryResult<MemoryIngestPersistencePreflightResult>> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (input.context.namespace !== input.request.namespace) {
    blockers.push("namespace_mismatch");
  }

  if (!input.context.userId.trim()) {
    blockers.push("missing_authenticated_user");
  }

  if (!input.request.input.trim()) {
    blockers.push("missing_input");
  }

  if (hasClientSuppliedUserId(input.request)) {
    warnings.push("client_user_id_ignored");
  }

  if (!input.requestHash) warnings.push("request_hash_unavailable");
  if (!input.fingerprint) warnings.push("fingerprint_unavailable");

  // Namespace boundaries are intentionally explicit for future writes:
  // real_life may never consume AU/story evidence, AU remains fictional/story scoped,
  // and no future persistence path may write across namespaces.
  const namespaceIsolation = buildNamespaceIsolationPolicy(input.context.namespace);

  return repositoryOk({
    status: blockers.length === 0 ? "ready" : "blocked",
    namespace: input.context.namespace,
    userId: input.context.userId,
    wouldPersist: false,
    wouldUseAppendOnlyPatch: true,
    wouldValidateNamespaceIsolation: true,
    wouldCreateAuditLog: true,
    wouldCreateRetrievalLog: false,
    wouldCallModel: false,
    wouldUseClientUserId: false,
    requiredWriteTargets: REQUIRED_WRITE_TARGETS,
    blockers,
    warnings,
    requestHash: input.requestHash ?? null,
    fingerprint: input.fingerprint ?? null,
    namespaceIsolation,
  });
}
