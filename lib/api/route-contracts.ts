import { z } from "zod";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import { pandoraNamespaceSchema } from "@/lib/memory/validation/contracts";

export const routeRuntimeStatusSchema = z.enum(["planned", "contract_only", "implemented"]);
export type RouteRuntimeStatus = z.infer<typeof routeRuntimeStatusSchema>;

export const routeMethodSchema = z.enum(["GET", "POST", "PATCH", "DELETE"]);
export type RouteMethod = z.infer<typeof routeMethodSchema>;

export const futureMemoryIngestRequestSchema = z.object({
  namespace: pandoraNamespaceSchema,
  input: z.string().min(1),
  source_ref: z.string().min(1).optional().nullable(),
  idempotency_key: z.string().min(8).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type FutureMemoryIngestRequest = z.infer<typeof futureMemoryIngestRequestSchema>;

export const futureMemoryIngestResponseSchema = z.object({
  ok: z.literal(true),
  namespace: pandoraNamespaceSchema,
  memoryItem: z.object({
    id: z.string().uuid(),
    memory_type: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    strength: z.string().min(1),
    confidence: z.number().min(0).max(1),
    canon_status: z.string().min(1),
    source_summary: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()),
    created_at: z.string().min(1),
    updated_at: z.string().nullable(),
  }),
  sources: z.array(z.record(z.string(), z.unknown())),
  warnings: z.array(z.string()),
  idempotency: z.object({
    status: z.enum(["completed"]),
    record_id: z.string().uuid(),
  }),
});

export type FutureMemoryIngestResponse = z.infer<typeof futureMemoryIngestResponseSchema>;

export type PlannedRouteContract = {
  method: RouteMethod;
  path: string;
  status: RouteRuntimeStatus;
  requiresAuth: boolean;
  mutatesMemory: boolean;
  description: string;
};

export const plannedRouteContracts: PlannedRouteContract[] = [
  {
    method: "POST",
    path: "/api/memory/ingest",
    status: "contract_only",
    requiresAuth: true,
    mutatesMemory: true,
    description: "Future memory ingest route. Contract exists but no route is exposed yet.",
  },
  {
    method: "POST",
    path: "/api/memory/search",
    status: "planned",
    requiresAuth: true,
    mutatesMemory: false,
    description: "Future memory search route.",
  },
  {
    method: "POST",
    path: "/api/memory/patch",
    status: "planned",
    requiresAuth: true,
    mutatesMemory: true,
    description: "Future append-only memory patch route.",
  },
];

export function assertRouteContractOnly(path: string): RepositoryResult<PlannedRouteContract> {
  const contract = plannedRouteContracts.find((route) => route.path === path);

  if (!contract) {
    return repositoryError("not_found", "Route contract was not found.", { path });
  }

  if (contract.status !== "contract_only") {
    return repositoryError("validation_error", "Route is not in contract-only state.", { path, status: contract.status });
  }

  return repositoryOk(contract);
}

export function createRouteRepositoryContext(input: {
  userId: string;
  namespace: FutureMemoryIngestRequest["namespace"];
  requestId?: string | null;
}): RepositoryResult<RepositoryContext> {
  if (!input.userId) {
    return repositoryError("unauthorized", "Authenticated user is required for route context.");
  }

  return repositoryOk({
    userId: input.userId,
    namespace: input.namespace,
    requestId: input.requestId ?? undefined,
  });
}
