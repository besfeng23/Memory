import { z } from "zod";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import { memoryNamespaceSchema } from "@/lib/validation/schemas";

export const routeRuntimeStatusSchema = z.enum(["planned", "contract_only", "disabled_stub", "implemented"]);
export type RouteRuntimeStatus = z.infer<typeof routeRuntimeStatusSchema>;

export const routeMethodSchema = z.enum(["GET", "POST", "PATCH", "DELETE"]);
export type RouteMethod = z.infer<typeof routeMethodSchema>;

export const futureMemoryIngestIdempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, "Use only letters, numbers, dot, underscore, colon, or hyphen.");

export const disabledRouteIdempotencyContractSchema = z.object({
  key_present: z.boolean(),
  key_stored: z.literal(false),
  claim_attempted: z.literal(false),
  conflict_evaluated: z.literal(false),
  conflict_status: z.literal("not_evaluated"),
});

export type DisabledRouteIdempotencyContract = z.infer<typeof disabledRouteIdempotencyContractSchema>;

export const disabledRouteResponseCacheContractSchema = z.object({
  cache_supported: z.literal(false),
  cache_lookup_attempted: z.literal(false),
  cache_write_attempted: z.literal(false),
  replay_supported: z.literal(false),
  replay_status: z.literal("not_available"),
});

export type DisabledRouteResponseCacheContract = z.infer<typeof disabledRouteResponseCacheContractSchema>;

export function buildDisabledRouteIdempotencyContract(
  key: string | null | undefined,
): DisabledRouteIdempotencyContract {
  return {
    key_present: Boolean(key),
    key_stored: false,
    claim_attempted: false,
    conflict_evaluated: false,
    conflict_status: "not_evaluated",
  };
}

export function buildDisabledRouteResponseCacheContract(): DisabledRouteResponseCacheContract {
  return {
    cache_supported: false,
    cache_lookup_attempted: false,
    cache_write_attempted: false,
    replay_supported: false,
    replay_status: "not_available",
  };
}

export const futureMemoryIngestRequestSchema = z.object({
  namespace: memoryNamespaceSchema,
  input: z.string().trim().min(1),
  source_ref: z
    .string()
    .trim()
    .min(1)
    .optional()
    .nullable()
    .transform((value) => value ?? null),
  idempotency_key: futureMemoryIngestIdempotencyKeySchema.optional().nullable().transform((value) => value ?? null),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type FutureMemoryIngestRequest = z.infer<typeof futureMemoryIngestRequestSchema>;

export const futureMemoryIngestResponseSchema = z.object({
  ok: z.literal(true),
  namespace: memoryNamespaceSchema,
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
    status: z.literal("completed"),
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
    status: "disabled_stub",
    requiresAuth: true,
    mutatesMemory: false,
    description: "Disabled 501 route harness.",
  },
  {
    method: "POST",
    path: "/api/memory/search",
    status: "planned",
    requiresAuth: true,
    mutatesMemory: false,
    description: "Future search route.",
  },
  {
    method: "POST",
    path: "/api/memory/patch",
    status: "planned",
    requiresAuth: true,
    mutatesMemory: true,
    description: "Future patch route.",
  },
];

function findRouteContract(path: string): RepositoryResult<PlannedRouteContract> {
  const contract = plannedRouteContracts.find((route) => route.path === path);
  if (!contract) {
    return repositoryError("not_found", "Route contract was not found.", { path });
  }
  return repositoryOk(contract);
}

export function assertRouteContractOnly(path: string): RepositoryResult<PlannedRouteContract> {
  const contract = findRouteContract(path);
  if (!contract.ok) return contract;
  if (contract.data.status !== "contract_only") {
    return repositoryError("validation_failed", "Route is not in contract-only state.", { path, status: contract.data.status });
  }
  return repositoryOk(contract.data);
}

export function assertRouteDisabled(path: string): RepositoryResult<PlannedRouteContract> {
  const contract = findRouteContract(path);
  if (!contract.ok) return contract;
  if (contract.data.status !== "disabled_stub") {
    return repositoryError("validation_failed", "Route is not in disabled state.", { path, status: contract.data.status });
  }
  return repositoryOk(contract.data);
}

export function createRouteRepositoryContext(input: {
  userId: string;
  namespace: FutureMemoryIngestRequest["namespace"];
  requestId?: string | null;
}): RepositoryResult<RepositoryContext> {
  if (!input.userId) {
    return repositoryError("auth_required", "Authenticated user is required for route context.");
  }

  return repositoryOk({
    userId: input.userId,
    namespace: input.namespace,
    requestId: input.requestId ?? undefined,
  });
}
