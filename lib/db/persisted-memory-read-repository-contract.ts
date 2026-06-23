import type { PersistedMemoryAuditDto, PersistedMemoryDetailRequest, PersistedMemoryDetailResult, PersistedMemoryItemDto, PersistedMemoryListRequest, PersistedMemoryListResult, PersistedMemoryPatchDto, PersistedMemoryReadContext, PersistedMemorySourceDto } from "@/lib/services/persisted-memory-read-contract";

export interface PersistedMemoryReadRepository {
  listMemoryItems(context: PersistedMemoryReadContext, request: PersistedMemoryListRequest): Promise<PersistedMemoryListResult<PersistedMemoryItemDto>>;
  getMemoryItemDetail(context: PersistedMemoryReadContext, request: PersistedMemoryDetailRequest): Promise<PersistedMemoryDetailResult<PersistedMemoryItemDto>>;
  listMemorySources(context: PersistedMemoryReadContext, request: PersistedMemoryListRequest): Promise<PersistedMemoryListResult<PersistedMemorySourceDto>>;
  getMemorySourceDetail(context: PersistedMemoryReadContext, request: PersistedMemoryDetailRequest): Promise<PersistedMemoryDetailResult<PersistedMemorySourceDto>>;
  listMemoryPatches(context: PersistedMemoryReadContext, request: PersistedMemoryListRequest): Promise<PersistedMemoryListResult<PersistedMemoryPatchDto>>;
  listMemoryAuditEvents(context: PersistedMemoryReadContext, request: PersistedMemoryListRequest): Promise<PersistedMemoryListResult<PersistedMemoryAuditDto>>;
}
