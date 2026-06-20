import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import {
  assertRouteDisabled,
  buildDisabledRouteIdempotencyContract,
  buildDisabledRouteResponseCacheContract,
  futureMemoryIngestRequestSchema,
} from "@/lib/api/route-contracts";
import { createRouteRepositoryContext } from "@/lib/api/route-repository-context";
import { getMemoryIngestTestModeState, type MemoryIngestRuntimeEnv } from "@/lib/api/memory-ingest-test-mode";
import type { MemoryIngestInternalWriteModeEnv } from "@/lib/services/memory-ingest-internal-write-mode";
import type { MemoryIngestPersistenceRepository } from "@/lib/db/memory-ingest-persistence-contract";
import { repositoryError } from "@/lib/db/repository-result";
import { runMemoryIngestRouteTestHarness } from "@/lib/api/memory-ingest-route-test-harness";
import { runMemoryIngestDryRunCandidate } from "@/lib/services/memory-ingest-dry-run-candidate";
import { runMemoryIngestInternalWriteHarness } from "@/lib/services/memory-ingest-internal-write-harness";

type MemoryIngestRouteEnv = MemoryIngestRuntimeEnv & MemoryIngestInternalWriteModeEnv;

export type MemoryIngestRouteHandlerDependencies = {
  resolveUser: () => Promise<Pick<User, "id"> | null>;
  env?: () => MemoryIngestRouteEnv;
  createPersistenceRepository?: () => MemoryIngestPersistenceRepository;
  requestHash?: (request: NextRequest, body: unknown) => string | null | Promise<string | null>;
  fingerprint?: (request: NextRequest, body: unknown) => string | null | Promise<string | null>;
};

const ROUTE = "/api/memory/ingest";
const INTERNAL_WRITE_HEADER = "x-pandora-test-ingest-mode";
const INTERNAL_WRITE_HEADER_VALUE = "internal-write-harness";

async function parseRequestBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function hasClientSuppliedUserId(body: unknown): boolean {
  return Boolean(
    body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      (Object.prototype.hasOwnProperty.call(body, "user_id") || Object.prototype.hasOwnProperty.call(body, "userId")),
  );
}

function internalWriteGate(input: { env: MemoryIngestRouteEnv; request: NextRequest; repositoryPresent: boolean }) {
  const blockers: string[] = [];
  if (input.env.NODE_ENV !== "test") blockers.push("node_env_must_be_test");
  if (input.env.PANDORA_ENABLE_MEMORY_INGEST_ROUTE !== "true") blockers.push("test_mode_flag_required");
  if (input.env.PANDORA_ENABLE_MEMORY_INGEST_INTERNAL_WRITE_MODE !== "true") blockers.push("internal_write_flag_required");
  if (input.request.headers.get(INTERNAL_WRITE_HEADER) !== INTERNAL_WRITE_HEADER_VALUE) blockers.push("internal_write_test_header_required");
  if (!input.repositoryPresent) blockers.push("fake_injected_persistence_repository_required");
  return { enabled: blockers.length === 0, blockers };
}

export function createMemoryIngestRouteHandler(dependencies: MemoryIngestRouteHandlerDependencies) {
  return async function POST(request: NextRequest) {
    const env = dependencies.env?.() ?? process.env;
    const user = await dependencies.resolveUser();

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          code: "auth_required",
          route: ROUTE,
          status: "disabled_stub",
          message: "Authentication is required before the disabled ingest route can be evaluated.",
        },
        { status: 401 },
      );
    }

    const body = await parseRequestBody(request);
    if (hasClientSuppliedUserId(body)) {
      return NextResponse.json(
        {
          ok: false,
          code: "client_user_id_forbidden",
          route: ROUTE,
          status: "disabled_stub",
          authenticated: true,
          message: "Client-supplied user_id/userId is forbidden. Ownership comes only from server auth context.",
        },
        { status: 400 },
      );
    }

    const parsed = futureMemoryIngestRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "validation_failed",
          route: ROUTE,
          status: "disabled_stub",
          authenticated: true,
          issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
          message: "Request validation failed. Memory ingest remains disabled and no state was changed.",
        },
        { status: 400 },
      );
    }

    const internalGate = internalWriteGate({ env, request, repositoryPresent: Boolean(dependencies.createPersistenceRepository) });
    if (request.headers.get(INTERNAL_WRITE_HEADER) === INTERNAL_WRITE_HEADER_VALUE || env.PANDORA_ENABLE_MEMORY_INGEST_INTERNAL_WRITE_MODE === "true") {
      if (!internalGate.enabled) {
        return NextResponse.json(
          {
            ok: false,
            code: "internal_write_harness_blocked",
            route: ROUTE,
            status: "test_internal_write_blocked",
            authenticated: true,
            namespace: parsed.data.namespace,
            blockers: internalGate.blockers,
            message: "Internal write harness route path is blocked unless all test-only controls are present.",
          },
          { status: 403 },
        );
      }

      const context = createRouteRepositoryContext({ user, namespace: parsed.data.namespace, requestId: request.headers.get("x-request-id") ?? undefined });
      if (!context.ok) {
        return NextResponse.json({ ok: false, code: context.error.code, route: ROUTE, status: "test_internal_write_blocked", message: context.error.message }, { status: 400 });
      }

      const result = await runMemoryIngestInternalWriteHarness({
        context: context.data,
        request: parsed.data,
        repository: dependencies.createPersistenceRepository!(),
        env,
        requestHash: dependencies.requestHash ? await dependencies.requestHash(request, parsed.data) : null,
        fingerprint: dependencies.fingerprint ? await dependencies.fingerprint(request, parsed.data) : null,
      });

      return NextResponse.json(
        {
          ok: result.status === "completed_test_only",
          route: ROUTE,
          status: "test_internal_write_harness_only",
          authenticated: true,
          namespace: parsed.data.namespace,
          result,
          message: "Memory ingest internal write harness completed in strict test-only mode using injected persistence.",
        },
        { status: result.status === "completed_test_only" ? 200 : 400 },
      );
    }

    const testMode = getMemoryIngestTestModeState(env);
    if (testMode.enabled) {
      const harnessResult = await runMemoryIngestRouteTestHarness({
        env,
        user,
        body: parsed.data,
        responseCacheRepository: { getByKey: async () => repositoryError("not_found", "not found") },
        runCandidate: runMemoryIngestDryRunCandidate,
      });

      if (!harnessResult.ok) {
        return NextResponse.json(
          {
            ok: false,
            code: harnessResult.error.code,
            route: ROUTE,
            status: "test_harness_error",
            authenticated: true,
            message: harnessResult.error.message,
            details: harnessResult.error.details ?? null,
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          route: ROUTE,
          status: "test_harness_only",
          authenticated: true,
          namespace: parsed.data.namespace,
          result: harnessResult.data.body,
          message: "Memory ingest test harness completed without production route activation.",
        },
        { status: 200 },
      );
    }

    const contract = assertRouteDisabled(ROUTE);
    const idempotency = buildDisabledRouteIdempotencyContract(parsed.data.idempotency_key);
    const response_cache = buildDisabledRouteResponseCacheContract();

    return NextResponse.json(
      {
        ok: false,
        code: "not_implemented",
        route: ROUTE,
        status: "disabled_stub",
        authenticated: true,
        namespace: parsed.data.namespace,
        idempotency,
        response_cache,
        contract: contract.ok ? contract.data : null,
        message: "Memory ingest is intentionally disabled. This route does not write memory, call models, or touch retrieval state.",
      },
      { status: 501 },
    );
  };
}
