import {
  MEMORY_INGEST_TRANSACTIONAL_RPC_INVARIANTS,
  MEMORY_INGEST_TRANSACTIONAL_RPC_NAME,
  type MemoryIngestRpcInsertPayload,
  type MemoryIngestTransactionalRpcPlan,
  type MemoryIngestTransactionalRpcRequest,
  type MemoryIngestTransactionalRpcResponse,
} from "@/lib/db/memory-ingest-rpc-contract";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";

export type MemoryIngestRpcClient = {
  rpc(name: typeof MEMORY_INGEST_TRANSACTIONAL_RPC_NAME, args: { request: MemoryIngestTransactionalRpcRequest }): Promise<{
    data: MemoryIngestTransactionalRpcResponse | null;
    error: { message?: string; code?: string; details?: string } | null;
  }>;
};

const FORBIDDEN_OPERATION_PATTERN = /(update|delete|overwrite|upsert|replace)/i;
const REQUIRED_PAYLOADS = ["source", "memoryItem", "memoryPatch", "auditLog", "idempotencyFinalization"] as const;

function payloadHasClientUserId(payload: MemoryIngestRpcInsertPayload): boolean {
  return Object.prototype.hasOwnProperty.call(payload, "user_id") || Object.prototype.hasOwnProperty.call(payload, "userId");
}

export function buildMemoryIngestTransactionRpcRequest(plan: MemoryIngestTransactionalRpcPlan): RepositoryResult<MemoryIngestTransactionalRpcRequest> {
  const blockers: string[] = [];
  const contextUserId = plan.context.userId.trim();
  if (!contextUserId) blockers.push("auth_required");
  if (plan.namespace !== plan.context.namespace) blockers.push("namespace_mismatch");
  if (plan.appendOnly !== true) blockers.push("operation_not_append_only");

  for (const payloadName of REQUIRED_PAYLOADS) {
    const payload = plan[payloadName];
    if (!payload || Object.keys(payload).length === 0) blockers.push(`missing_${payloadName}_payload`);
    if (payload && payloadHasClientUserId(payload)) blockers.push("client_user_id_rejected");
  }

  if (!plan.requestHash.trim()) blockers.push("missing_request_hash");
  if (!plan.fingerprint.trim()) blockers.push("missing_fingerprint");
  if (plan.operationOrder[plan.operationOrder.length - 1]?.operation !== "finalize_idempotency_record") blockers.push("idempotency_finalization_not_last");

  for (const operation of plan.operationOrder) {
    if (operation.namespace !== plan.namespace) blockers.push("namespace_mismatch");
    if (operation.appendOnly !== true) blockers.push("operation_not_append_only");
    if (FORBIDDEN_OPERATION_PATTERN.test(operation.operation) || FORBIDDEN_OPERATION_PATTERN.test(operation.target)) blockers.push("forbidden_mutation_operation");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  if (uniqueBlockers.length > 0) return repositoryError("validation_failed", "Memory ingest transactional RPC request is blocked.", { blockers: uniqueBlockers });

  return repositoryOk({
    userId: contextUserId,
    namespace: plan.namespace,
    source: plan.source,
    memoryItem: plan.memoryItem,
    memoryPatch: plan.memoryPatch,
    auditLog: plan.auditLog,
    idempotencyFinalization: plan.idempotencyFinalization,
    requestHash: plan.requestHash,
    fingerprint: plan.fingerprint,
    operationOrder: plan.operationOrder,
    invariants: MEMORY_INGEST_TRANSACTIONAL_RPC_INVARIANTS,
  });
}

export async function executeMemoryIngestTransactionRpc(input: {
  context: MemoryIngestTransactionalRpcPlan["context"];
  plan: Omit<MemoryIngestTransactionalRpcPlan, "context">;
  client: MemoryIngestRpcClient;
}): Promise<RepositoryResult<MemoryIngestTransactionalRpcResponse>> {
  const request = buildMemoryIngestTransactionRpcRequest({ ...input.plan, context: input.context });
  if (!request.ok) return request;
  const result = await input.client.rpc(MEMORY_INGEST_TRANSACTIONAL_RPC_NAME, { request: request.data });
  if (result.error) return repositoryError("database_error", "Memory ingest transactional RPC failed.", { error: result.error });
  if (!result.data) return repositoryError("database_error", "Memory ingest transactional RPC returned no data.");
  if (result.data.status !== "applied") return repositoryError("validation_failed", "Memory ingest transactional RPC did not apply.", { response: result.data });
  return repositoryOk(result.data);
}
