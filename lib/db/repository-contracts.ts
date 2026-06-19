import type { PublicTableInsert, PublicTableName, PublicTableRow } from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { RepositoryResult } from "@/lib/db/repository-result";

export type RepositoryReadInput<TableName extends PublicTableName> = {
  context: RepositoryContext;
  tableName: TableName;
  id: string;
};

export type RepositoryListInput<TableName extends PublicTableName> = {
  context: RepositoryContext;
  tableName: TableName;
  limit?: number;
};

export type RepositoryCreateInput<TableName extends PublicTableName> = {
  context: RepositoryContext;
  tableName: TableName;
  values: Omit<PublicTableInsert<TableName>, "user_id">;
};

export type ReadRepository<TableName extends PublicTableName> = {
  getById(input: RepositoryReadInput<TableName>): Promise<RepositoryResult<PublicTableRow<TableName>>>;
  list(input: RepositoryListInput<TableName>): Promise<RepositoryResult<PublicTableRow<TableName>[]>>;
};

export type CreateRepository<TableName extends PublicTableName> = {
  create(input: RepositoryCreateInput<TableName>): Promise<RepositoryResult<PublicTableRow<TableName>>>;
};

export type PandoraRepository<TableName extends PublicTableName> = ReadRepository<TableName> & CreateRepository<TableName>;

export function withOwner<TableName extends PublicTableName>(
  context: RepositoryContext,
  values: Omit<PublicTableInsert<TableName>, "user_id">,
): PublicTableInsert<TableName> {
  return {
    ...values,
    user_id: context.userId,
  } as PublicTableInsert<TableName>;
}
