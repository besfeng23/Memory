import type { User } from "@supabase/supabase-js";
import type { PandoraNamespace } from "@/lib/supabase/database.types";
import { createRepositoryContext, type RepositoryContext } from "@/lib/db/repository-context";
import type { RepositoryResult } from "@/lib/db/repository-result";

export type RouteRepositoryContextInput = {
  user: Pick<User, "id"> | null;
  namespace: PandoraNamespace;
  requestId?: string;
};

export function createRouteRepositoryContext(
  input: RouteRepositoryContextInput,
): RepositoryResult<RepositoryContext> {
  return createRepositoryContext({
    namespace: input.namespace,
    requestId: input.requestId,
    userId: input.user?.id ?? null,
  });
}
