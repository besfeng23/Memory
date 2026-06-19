import type { PandoraNamespace, PublicTableInsert, PublicTableName, PublicTableRow } from "@/lib/supabase/database.types";
import { hasMatchingInsertNamespace, hasMatchingNamespace, tableAllowsNamespace } from "@/lib/db/namespaces";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";

export function assertTableNamespace(tableName: PublicTableName, namespace: PandoraNamespace): RepositoryResult<true> {
  if (!tableAllowsNamespace(tableName, namespace)) {
    return repositoryError("namespace_mismatch", "Table cannot be used with the requested namespace.", {
      tableName,
      namespace,
    });
  }

  return repositoryOk(true);
}

export function assertRowNamespace<TableName extends PublicTableName>(
  tableName: TableName,
  row: Pick<PublicTableRow<TableName>, "namespace">,
): RepositoryResult<true> {
  if (!hasMatchingNamespace(tableName, row)) {
    return repositoryError("namespace_mismatch", "Row namespace does not match the table boundary.", {
      tableName,
      namespace: row.namespace,
    });
  }

  return repositoryOk(true);
}

export function assertInsertNamespace<TableName extends PublicTableName>(
  tableName: TableName,
  row: Pick<PublicTableInsert<TableName>, "namespace">,
): RepositoryResult<true> {
  if (!hasMatchingInsertNamespace(tableName, row)) {
    return repositoryError("namespace_mismatch", "Insert namespace does not match the table boundary.", {
      tableName,
      namespace: row.namespace,
    });
  }

  return repositoryOk(true);
}
