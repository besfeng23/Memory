import type { PandoraNamespace, PublicTableInsert, PublicTableName } from "@/lib/supabase/database.types";
import { assertInsertNamespace, assertTableNamespace } from "@/lib/db/repository-guards";
import { createRepositoryContext, type RepositoryContext } from "@/lib/db/repository-context";
import { repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";

export type ServiceContextInput = {
  userId?: string | null;
  namespace: PandoraNamespace;
  requestId?: string;
};

export function createServiceContext(input: ServiceContextInput): RepositoryResult<RepositoryContext> {
  return createRepositoryContext(input);
}

export function prepareOwnedInsert<TableName extends PublicTableName>(input: {
  context: RepositoryContext;
  tableName: TableName;
  values: Omit<PublicTableInsert<TableName>, "user_id">;
}): RepositoryResult<PublicTableInsert<TableName>> {
  const tableCheck = assertTableNamespace(input.tableName, input.context.namespace);
  if (!tableCheck.ok) {
    return tableCheck;
  }

  const namespaceCheck = assertInsertNamespace(input.tableName, input.values);
  if (!namespaceCheck.ok) {
    return namespaceCheck;
  }

  return repositoryOk({
    ...input.values,
    user_id: input.context.userId,
  } as PublicTableInsert<TableName>);
}
