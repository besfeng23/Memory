import type { PandoraNamespace } from "@/lib/supabase/database.types";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";

export type RepositoryContext = {
  userId: string;
  namespace: PandoraNamespace;
  requestId?: string;
};

export function createRepositoryContext(input: {
  userId?: string | null;
  namespace: PandoraNamespace;
  requestId?: string;
}): RepositoryResult<RepositoryContext> {
  const normalizedUserId = input.userId?.trim();

  if (!normalizedUserId) {
    return repositoryError("auth_required", "Authenticated user is required for repository operations.");
  }

  return repositoryOk({
    userId: normalizedUserId,
    namespace: input.namespace,
    requestId: input.requestId,
  });
}
