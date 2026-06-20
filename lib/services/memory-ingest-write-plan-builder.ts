import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { MemoryIngestPersistencePreflightResult } from "@/lib/services/memory-ingest-persistence-preflight";
import type { PandoraNamespace } from "@/lib/supabase/database.types";

export type MemoryIngestPlannedOperationName =
  | "validate_namespace_boundary"
  | "insert_memory_source"
  | "insert_memory_item"
  | "insert_memory_patch"
  | "insert_audit_log"
  | "finalize_idempotency_record";

export type MemoryIngestPlannedOperation = {
  operation: MemoryIngestPlannedOperationName;
  target: "namespace_policy" | "memory_sources" | "memory_items" | "memory_patches" | "audit_logs" | "idempotency_records";
  mode: "planned_only";
  appendOnly: true;
  writesNow: false;
};

export type MemoryIngestWritePlan = {
  status: "planned" | "blocked";
  namespace: PandoraNamespace;
  userId: string;
  wouldPersist: false;
  appendOnly: true;
  usesClientUserId: false;
  wouldCallModel: false;
  wouldPerformRetrieval: false;
  requestHash: string | null;
  fingerprint: string | null;
  plannedOperations: MemoryIngestPlannedOperation[];
  blockers: string[];
  warnings: string[];
  namespaceIsolation: {
    namespace: PandoraNamespace;
    realLifeCannotConsumeAuEvidence: true;
    auContentRemainsFictionalStoryScoped: true;
  };
};

export type MemoryIngestWritePlanBuilderInput = {
  context: RepositoryContext;
  request: FutureMemoryIngestRequest;
  preflight: MemoryIngestPersistencePreflightResult;
  requestHash?: string | null;
  fingerprint?: string | null;
  dryRunMetadata?: Record<string, unknown>;
};

const PLANNED_OPERATIONS: MemoryIngestPlannedOperation[] = [
  { operation: "validate_namespace_boundary", target: "namespace_policy", mode: "planned_only", appendOnly: true, writesNow: false },
  { operation: "insert_memory_source", target: "memory_sources", mode: "planned_only", appendOnly: true, writesNow: false },
  { operation: "insert_memory_item", target: "memory_items", mode: "planned_only", appendOnly: true, writesNow: false },
  { operation: "insert_memory_patch", target: "memory_patches", mode: "planned_only", appendOnly: true, writesNow: false },
  { operation: "insert_audit_log", target: "audit_logs", mode: "planned_only", appendOnly: true, writesNow: false },
  { operation: "finalize_idempotency_record", target: "idempotency_records", mode: "planned_only", appendOnly: true, writesNow: false },
];

function hasClientSuppliedUserId(request: FutureMemoryIngestRequest): boolean {
  return Object.prototype.hasOwnProperty.call(request.metadata, "user_id") || Object.prototype.hasOwnProperty.call(request.metadata, "userId");
}

export function buildMemoryIngestWritePlan(input: MemoryIngestWritePlanBuilderInput): RepositoryResult<MemoryIngestWritePlan> {
  const blockers = [...input.preflight.blockers];
  const warnings = [...input.preflight.warnings];

  if (input.preflight.status !== "ready") blockers.push("preflight_not_ready");
  if (input.context.namespace !== input.request.namespace) blockers.push("namespace_mismatch");
  if (!input.context.userId.trim()) blockers.push("missing_authenticated_user");
  if (!input.request.input.trim()) blockers.push("missing_input");
  if (hasClientSuppliedUserId(input.request)) blockers.push("client_user_id_override_attempt");

  const uniqueBlockers = Array.from(new Set(blockers));

  return repositoryOk({
    status: uniqueBlockers.length === 0 ? "planned" : "blocked",
    namespace: input.context.namespace,
    userId: input.context.userId,
    wouldPersist: false,
    appendOnly: true,
    usesClientUserId: false,
    wouldCallModel: false,
    wouldPerformRetrieval: false,
    requestHash: input.requestHash ?? input.preflight.requestHash ?? null,
    fingerprint: input.fingerprint ?? input.preflight.fingerprint ?? null,
    plannedOperations: PLANNED_OPERATIONS.map((operation) => ({ ...operation })),
    blockers: uniqueBlockers,
    warnings,
    namespaceIsolation: {
      namespace: input.context.namespace,
      realLifeCannotConsumeAuEvidence: true,
      auContentRemainsFictionalStoryScoped: true,
    },
  });
}
