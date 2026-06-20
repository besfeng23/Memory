import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { MemoryIngestPersistenceRepository } from "@/lib/db/memory-ingest-persistence-contract";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { MemoryIngestPlannedOperationName, MemoryIngestWritePlan } from "@/lib/services/memory-ingest-write-plan-builder";

export type MemoryIngestPersistenceExecutorInput = {
  enabled: boolean;
  context: RepositoryContext;
  request: FutureMemoryIngestRequest;
  writePlan: MemoryIngestWritePlan;
  repository: MemoryIngestPersistenceRepository;
  requestHash?: string | null;
  fingerprint?: string | null;
};

export type MemoryIngestPersistenceExecutionResult = {
  status: "persisted" | "blocked";
  namespace: RepositoryContext["namespace"];
  userId: string;
  operationOrder: MemoryIngestPlannedOperationName[];
  memorySourceId?: string;
  memoryItemId?: string;
  memoryPatchId?: string;
  auditLogId?: string;
  idempotencyRecordId?: string;
  blockers: string[];
};

const REQUIRED_OPERATION_ORDER: MemoryIngestPlannedOperationName[] = [
  "validate_namespace_boundary",
  "insert_memory_source",
  "insert_memory_item",
  "insert_memory_patch",
  "insert_audit_log",
  "finalize_idempotency_record",
];

const FORBIDDEN_OPERATION_PATTERN = /(update|delete|overwrite|upsert|replace)/i;

function blocked(input: MemoryIngestExecutorValidationInput, blockers: string[]): RepositoryResult<MemoryIngestPersistenceExecutionResult> {
  return repositoryOk({
    status: "blocked",
    namespace: input.context.namespace,
    userId: input.context.userId,
    operationOrder: input.writePlan.plannedOperations.map((operation) => operation.operation),
    blockers,
  });
}

type MemoryIngestExecutorValidationInput = Pick<MemoryIngestPersistenceExecutorInput, "enabled" | "context" | "request" | "writePlan">;

function validateExecutorInput(input: MemoryIngestExecutorValidationInput): string[] {
  const blockers: string[] = [];

  if (!input.enabled) blockers.push("persistence_executor_disabled");
  if (input.writePlan.status !== "planned") blockers.push("write_plan_not_planned");
  if (input.context.namespace !== input.request.namespace || input.writePlan.namespace !== input.context.namespace) blockers.push("namespace_mismatch");
  if (!input.context.userId.trim()) blockers.push("missing_authenticated_user");
  if (input.writePlan.userId !== input.context.userId) blockers.push("user_id_mismatch");
  if (Object.prototype.hasOwnProperty.call(input.request.metadata, "user_id") || Object.prototype.hasOwnProperty.call(input.request.metadata, "userId")) {
    blockers.push("client_user_id_override_attempt");
  }
  if (!input.writePlan.appendOnly) blockers.push("write_plan_not_append_only");
  if (input.writePlan.wouldCallModel) blockers.push("model_call_not_allowed");
  if (input.writePlan.wouldPerformRetrieval) blockers.push("retrieval_not_allowed");

  const operationOrder = input.writePlan.plannedOperations.map((operation) => operation.operation);
  if (JSON.stringify(operationOrder) !== JSON.stringify(REQUIRED_OPERATION_ORDER)) blockers.push("invalid_operation_order");

  for (const operation of input.writePlan.plannedOperations) {
    if (operation.appendOnly !== true) blockers.push("operation_not_append_only");
    if (operation.writesNow !== false) blockers.push("write_plan_operation_must_be_planned_only");
    if (FORBIDDEN_OPERATION_PATTERN.test(operation.operation) || FORBIDDEN_OPERATION_PATTERN.test(operation.target)) {
      blockers.push("forbidden_mutation_operation");
    }
  }

  return Array.from(new Set(blockers));
}

export async function executeMemoryIngestPersistencePlan(
  input: MemoryIngestPersistenceExecutorInput,
): Promise<RepositoryResult<MemoryIngestPersistenceExecutionResult>> {
  const blockers = validateExecutorInput(input);
  if (blockers.length > 0) return blocked(input, blockers);

  const base = {
    context: input.context,
    namespace: input.context.namespace,
    userId: input.context.userId,
    appendOnly: true as const,
    mode: "append_only" as const,
    requestHash: input.requestHash ?? input.writePlan.requestHash,
    fingerprint: input.fingerprint ?? input.writePlan.fingerprint,
  };

  const source = await input.repository.insertMemorySource({ ...base, sourceRef: input.request.source_ref, metadata: input.request.metadata });
  if (!source.ok) return source;

  const item = await input.repository.insertMemoryItem({ ...base, memorySourceId: source.data.memorySourceId, input: input.request.input, metadata: input.request.metadata });
  if (!item.ok) return item;

  const patch = await input.repository.insertMemoryPatch({
    ...base,
    memoryItemId: item.data.memoryItemId,
    memorySourceId: source.data.memorySourceId,
    patchType: "ingest_append",
    metadata: input.request.metadata,
  });
  if (!patch.ok) return patch;

  const audit = await input.repository.insertAuditLog({
    ...base,
    memorySourceId: source.data.memorySourceId,
    memoryItemId: item.data.memoryItemId,
    memoryPatchId: patch.data.memoryPatchId,
    action: "memory_ingest_append_planned",
    metadata: input.request.metadata,
  });
  if (!audit.ok) return audit;

  const idempotency = await input.repository.finalizeIdempotencyRecord({
    ...base,
    idempotencyKey: input.request.idempotency_key,
    memorySourceId: source.data.memorySourceId,
    memoryItemId: item.data.memoryItemId,
    memoryPatchId: patch.data.memoryPatchId,
    auditLogId: audit.data.auditLogId,
  });
  if (!idempotency.ok) return idempotency;

  return repositoryOk({
    status: "persisted",
    namespace: input.context.namespace,
    userId: input.context.userId,
    operationOrder: REQUIRED_OPERATION_ORDER,
    memorySourceId: source.data.memorySourceId,
    memoryItemId: item.data.memoryItemId,
    memoryPatchId: patch.data.memoryPatchId,
    auditLogId: audit.data.auditLogId,
    idempotencyRecordId: idempotency.data.idempotencyRecordId,
    blockers: [],
  });
}
