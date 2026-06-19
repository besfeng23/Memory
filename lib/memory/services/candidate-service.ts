import type { MemoryItemRow, MemorySourceRow, PublicTableInsert } from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { createMemoryItemsRepository, createMemorySourcesRepository } from "@/lib/db/core-repositories";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import {
  validateMemoryCandidate,
  type MemoryCandidate,
  type MemorySourceCandidate,
  type MemoryValidationContext,
  type MemoryValidationError,
} from "@/lib/memory/validation";

export type MemoryCandidateServiceInput = {
  context: RepositoryContext;
  candidate: unknown;
};

export type MemoryCandidateServiceOptions = {
  memoryItemsRepository?: ReturnType<typeof createMemoryItemsRepository>;
  memorySourcesRepository?: ReturnType<typeof createMemorySourcesRepository>;
  now?: () => string;
};

export type PreparedMemoryCandidate = {
  candidate: MemoryCandidate;
  memoryItem: Omit<PublicTableInsert<"memory_items">, "user_id">;
  sources: Array<Omit<PublicTableInsert<"memory_sources">, "user_id" | "memory_item_id" | "namespace">>;
  warnings: MemoryValidationError[];
};

export type PersistedMemoryCandidate = {
  memoryItem: MemoryItemRow;
  sources: MemorySourceRow[];
  warnings: MemoryValidationError[];
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

function defaultNow() {
  return new Date().toISOString();
}

function toMemoryItemInsert(candidate: MemoryCandidate, now: string): Omit<PublicTableInsert<"memory_items">, "user_id"> {
  return {
    namespace: candidate.namespace,
    memory_type: candidate.memory_type,
    title: candidate.title,
    body: candidate.body,
    strength: candidate.strength,
    confidence: candidate.confidence,
    canon_status: candidate.canon_status,
    source_summary: candidate.source_summary ?? null,
    metadata: candidate.metadata,
    is_active: true,
    updated_at: now,
  };
}

function toSourceInsert(
  candidate: MemorySourceCandidate,
): Omit<PublicTableInsert<"memory_sources">, "user_id" | "memory_item_id" | "namespace"> {
  return {
    source_type: candidate.source_type,
    source_ref: candidate.source_ref ?? null,
    excerpt: candidate.excerpt ?? null,
    confidence: candidate.confidence,
    metadata: candidate.metadata,
  };
}

export function prepareMemoryCandidate(
  input: MemoryCandidateServiceInput,
  options: Pick<MemoryCandidateServiceOptions, "now"> = {},
): RepositoryResult<PreparedMemoryCandidate> {
  const validation = validateMemoryCandidate(validationContext(input.context), input.candidate);

  if (!validation.ok) {
    return repositoryError("validation_failed", "Memory candidate validation failed.", validationErrorDetails(validation.errors));
  }

  return repositoryOk({
    candidate: validation.data,
    memoryItem: toMemoryItemInsert(validation.data, (options.now ?? defaultNow)()),
    sources: validation.data.sources.map((source) => toSourceInsert(source)),
    warnings: validation.warnings,
  });
}

export async function saveMemoryCandidate(
  input: MemoryCandidateServiceInput,
  options: MemoryCandidateServiceOptions = {},
): Promise<RepositoryResult<PersistedMemoryCandidate>> {
  const prepared = prepareMemoryCandidate(input, { now: options.now });

  if (!prepared.ok) {
    return prepared;
  }

  const memoryItemsRepository = options.memoryItemsRepository ?? createMemoryItemsRepository();
  const memorySourcesRepository = options.memorySourcesRepository ?? createMemorySourcesRepository();

  const memoryItemResult = await memoryItemsRepository.create({
    context: input.context,
    tableName: "memory_items",
    values: prepared.data.memoryItem,
  });

  if (!memoryItemResult.ok) {
    return memoryItemResult;
  }

  const createdSources: MemorySourceRow[] = [];

  for (const source of prepared.data.sources) {
    const sourceResult = await memorySourcesRepository.create({
      context: input.context,
      tableName: "memory_sources",
      values: {
        ...source,
        namespace: prepared.data.candidate.namespace,
        memory_item_id: memoryItemResult.data.id,
      },
    });

    if (!sourceResult.ok) {
      return sourceResult;
    }

    createdSources.push(sourceResult.data);
  }

  return repositoryOk({
    memoryItem: memoryItemResult.data,
    sources: createdSources,
    warnings: prepared.data.warnings,
  });
}
