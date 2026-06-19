import type {
  CanonStatus,
  MemoryItemRow,
  MemoryStrength,
  MemoryType,
} from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { createMemoryItemsRepository, createRetrievalLogsRepository } from "@/lib/db/core-repositories";
import { repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import { writeRetrievalLog } from "@/lib/memory/services/logging-service";

export type MemoryRetrievalFilters = {
  memoryType?: MemoryType;
  strength?: MemoryStrength;
  canonStatus?: CanonStatus;
  activeOnly?: boolean;
};

export type MemoryRetrievalInput = {
  context: RepositoryContext;
  queryText?: string;
  filters?: MemoryRetrievalFilters;
  limit?: number;
  logRetrieval?: boolean;
};

export type MemoryRetrievalServiceOptions = {
  memoryItemsRepository?: ReturnType<typeof createMemoryItemsRepository>;
  retrievalLogsRepository?: ReturnType<typeof createRetrievalLogsRepository>;
};

export type MemoryRetrievalResult = {
  items: MemoryItemRow[];
  returnedItemIds: string[];
  logged: boolean;
};

function normalizeQueryText(queryText: string | undefined): string {
  return queryText?.trim() ?? "";
}

function matchesQuery(row: MemoryItemRow, queryText: string): boolean {
  if (!queryText) {
    return true;
  }

  const normalizedQuery = queryText.toLowerCase();
  return row.title.toLowerCase().includes(normalizedQuery) || row.body.toLowerCase().includes(normalizedQuery);
}

function matchesFilters(row: MemoryItemRow, filters: MemoryRetrievalFilters | undefined): boolean {
  if (filters?.memoryType && row.memory_type !== filters.memoryType) {
    return false;
  }

  if (filters?.strength && row.strength !== filters.strength) {
    return false;
  }

  if (filters?.canonStatus && row.canon_status !== filters.canonStatus) {
    return false;
  }

  if (filters?.activeOnly !== false && !row.is_active) {
    return false;
  }

  return true;
}

function serializeFilters(filters: MemoryRetrievalFilters | undefined) {
  return {
    memoryType: filters?.memoryType ?? null,
    strength: filters?.strength ?? null,
    canonStatus: filters?.canonStatus ?? null,
    activeOnly: filters?.activeOnly ?? true,
  };
}

export async function retrieveMemoryItems(
  input: MemoryRetrievalInput,
  options: MemoryRetrievalServiceOptions = {},
): Promise<RepositoryResult<MemoryRetrievalResult>> {
  const memoryItemsRepository = options.memoryItemsRepository ?? createMemoryItemsRepository();
  const normalizedQueryText = normalizeQueryText(input.queryText);
  const requestedLimit = input.limit ?? 25;

  const listResult = await memoryItemsRepository.list({
    context: input.context,
    tableName: "memory_items",
    limit: requestedLimit,
  });

  if (!listResult.ok) {
    return listResult;
  }

  const items = listResult.data.filter((row) => matchesQuery(row, normalizedQueryText) && matchesFilters(row, input.filters));
  const returnedItemIds = items.map((item) => item.id);
  let logged = false;

  if (input.logRetrieval) {
    const logResult = await writeRetrievalLog(
      {
        context: input.context,
        queryText: normalizedQueryText,
        filters: serializeFilters(input.filters),
        requestedLimit,
        returnedItemIds,
        metadata: {
          retrieval_service: "internal_scaffold",
          semantic_search: false,
          pgvector: false,
        },
      },
      {
        retrievalLogsRepository: options.retrievalLogsRepository,
      },
    );

    if (!logResult.ok) {
      return logResult;
    }

    logged = true;
  }

  return repositoryOk({
    items,
    returnedItemIds,
    logged,
  });
}

export async function getMemoryItemById(
  context: RepositoryContext,
  id: string,
  options: Pick<MemoryRetrievalServiceOptions, "memoryItemsRepository"> = {},
): Promise<RepositoryResult<MemoryItemRow>> {
  const memoryItemsRepository = options.memoryItemsRepository ?? createMemoryItemsRepository();

  return memoryItemsRepository.getById({
    context,
    tableName: "memory_items",
    id,
  });
}
