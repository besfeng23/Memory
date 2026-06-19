import { repositoryError, type RepositoryResult } from "@/lib/db/repository-result";
import type { IdempotencyContext } from "@/lib/services/idempotency";

export type TransactionBoundaryContext = {
  operationName: string;
  requestId?: string | null;
  idempotency?: IdempotencyContext | null;
};

export type TransactionAdapter = {
  run<T>(context: TransactionBoundaryContext, operation: () => Promise<RepositoryResult<T>>): Promise<RepositoryResult<T>>;
};

export type TransactionBoundaryOptions = {
  context: TransactionBoundaryContext;
  adapter?: TransactionAdapter | null;
  requireTransaction?: boolean;
};

export async function runTransactionBoundary<T>(
  options: TransactionBoundaryOptions,
  operation: () => Promise<RepositoryResult<T>>,
): Promise<RepositoryResult<T>> {
  const operationName = options.context.operationName.trim();

  if (!operationName) {
    return repositoryError("validation_failed", "Transaction boundary operation name is required.");
  }

  if (!options.adapter) {
    if (options.requireTransaction) {
      return repositoryError("database_error", "A real transaction adapter is required for this operation.", {
        operationName,
      });
    }

    return operation();
  }

  return options.adapter.run(
    {
      ...options.context,
      operationName,
    },
    operation,
  );
}

export function createInlineTransactionAdapter(): TransactionAdapter {
  return {
    async run(_context, operation) {
      return operation();
    },
  };
}
