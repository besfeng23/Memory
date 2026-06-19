import type { AuditLogRow, Json, MemoryPatchRow, PublicTableInsert } from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { createAuditLogsRepository, createMemoryPatchesRepository } from "@/lib/db/core-repositories";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import {
  validateMemoryPatchCandidate,
  type MemoryPatchCandidate,
  type MemoryValidationContext,
  type MemoryValidationError,
} from "@/lib/memory/validation";
import { writeAuditLog } from "@/lib/memory/services/logging-service";

export type MemoryPatchServiceInput = {
  context: RepositoryContext;
  candidate: unknown;
};

export type MemoryPatchServiceOptions = {
  memoryPatchesRepository?: ReturnType<typeof createMemoryPatchesRepository>;
  auditLogsRepository?: ReturnType<typeof createAuditLogsRepository>;
};

export type PreparedMemoryPatch = {
  candidate: MemoryPatchCandidate;
  patch: Omit<PublicTableInsert<"memory_patches">, "user_id">;
};

export type PersistedMemoryPatch = {
  patch: MemoryPatchRow;
  auditLog: AuditLogRow;
};

function validationContext(context: RepositoryContext): MemoryValidationContext {
  return {
    userId: context.userId,
    namespace: context.namespace,
  };
}

function validationErrorDetails(errors: MemoryValidationError[]) {
  return {
    errors: errors.map((error) => ({
      code: error.code,
      message: error.message,
      path: error.path,
      details: error.details,
    })),
  };
}

function toJson(value: Record<string, unknown>): Json {
  return value as Json;
}

function toPatchInsert(candidate: MemoryPatchCandidate): Omit<PublicTableInsert<"memory_patches">, "user_id"> {
  return {
    namespace: candidate.namespace,
    memory_item_id: candidate.memory_item_id,
    patch_type: candidate.patch_type,
    reason: candidate.reason ?? null,
    before_snapshot: candidate.before_snapshot ? toJson(candidate.before_snapshot) : null,
    after_snapshot: toJson(candidate.after_snapshot),
    metadata: toJson(candidate.metadata),
  };
}

export function prepareMemoryPatch(input: MemoryPatchServiceInput): RepositoryResult<PreparedMemoryPatch> {
  const validation = validateMemoryPatchCandidate(validationContext(input.context), input.candidate);

  if (!validation.ok) {
    return repositoryError("validation_failed", "Memory patch candidate validation failed.", validationErrorDetails(validation.errors));
  }

  return repositoryOk({
    candidate: validation.data,
    patch: toPatchInsert(validation.data),
  });
}

export async function saveMemoryPatch(
  input: MemoryPatchServiceInput,
  options: MemoryPatchServiceOptions = {},
): Promise<RepositoryResult<PersistedMemoryPatch>> {
  const prepared = prepareMemoryPatch(input);

  if (!prepared.ok) {
    return prepared;
  }

  const memoryPatchesRepository = options.memoryPatchesRepository ?? createMemoryPatchesRepository();
  const auditLogsRepository = options.auditLogsRepository ?? createAuditLogsRepository();

  const patchResult = await memoryPatchesRepository.create({
    context: input.context,
    tableName: "memory_patches",
    values: prepared.data.patch,
  });

  if (!patchResult.ok) {
    return patchResult;
  }

  const auditResult = await writeAuditLog(
    {
      context: input.context,
      action: "memory_patch_created",
      tableName: "memory_items",
      recordId: prepared.data.candidate.memory_item_id,
      beforeSnapshot: prepared.data.candidate.before_snapshot ? toJson(prepared.data.candidate.before_snapshot) : null,
      afterSnapshot: prepared.data.patch.after_snapshot,
      metadata: {
        memory_patch_id: patchResult.data.id,
        patch_type: prepared.data.candidate.patch_type,
        reason: prepared.data.candidate.reason ?? null,
      },
    },
    { auditLogsRepository },
  );

  if (!auditResult.ok) {
    return auditResult;
  }

  return repositoryOk({
    patch: patchResult.data,
    auditLog: auditResult.data,
  });
}
