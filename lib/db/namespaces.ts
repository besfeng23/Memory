import type { PandoraNamespace, PublicTableInsert, PublicTableName, PublicTableRow } from "@/lib/supabase/database.types";
import { isAuTableName, isRealLifeTableName } from "@/lib/db/table-names";

export function expectedNamespaceForTable(tableName: PublicTableName): PandoraNamespace | null {
  if (isRealLifeTableName(tableName)) {
    return "real_life";
  }

  if (isAuTableName(tableName)) {
    return "au";
  }

  return null;
}

export function tableAllowsNamespace(tableName: PublicTableName, namespace: PandoraNamespace): boolean {
  const expectedNamespace = expectedNamespaceForTable(tableName);

  return expectedNamespace === null || expectedNamespace === namespace;
}

export function hasMatchingNamespace<TableName extends PublicTableName>(
  tableName: TableName,
  row: Pick<PublicTableRow<TableName>, "namespace">,
): boolean {
  return tableAllowsNamespace(tableName, row.namespace);
}

export function hasMatchingInsertNamespace<TableName extends PublicTableName>(
  tableName: TableName,
  row: Pick<PublicTableInsert<TableName>, "namespace">,
): boolean {
  return row.namespace === undefined || tableAllowsNamespace(tableName, row.namespace as PandoraNamespace);
}
