import { NextResponse, type NextRequest } from "next/server";
import {
  assertRouteDisabled,
  buildDisabledRouteIdempotencyContract,
  buildDisabledRouteResponseCacheContract,
  futureMemoryIngestRequestSchema,
} from "@/lib/api/route-contracts";
import { runMemoryIngestRouteTestHarness } from "@/lib/api/memory-ingest-route-test-harness";
import { getMemoryIngestTestModeState } from "@/lib/api/memory-ingest-test-mode";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import { getCurrentUser } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

async function parseRequestBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        code: "auth_required",
        route: "/api/memory/ingest",
        status: "disabled_stub",
        message: "Authentication is required before the disabled ingest route can be evaluated.",
      },
      { status: 401 },
    );
  }

  const body = await parseRequestBody(request);
  const parsed = futureMemoryIngestRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "validation_failed",
        route: "/api/memory/ingest",
        status: "disabled_stub",
        authenticated: true,
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        message: "Request validation failed. Memory ingest remains disabled and no state was changed.",
      },
      { status: 400 },
    );
  }

  const testMode = getMemoryIngestTestModeState();
  if (testMode.enabled) {
    const harnessResult = await runMemoryIngestRouteTestHarness({
      env: process.env,
      user,
      body: parsed.data,
      responseCacheRepository: { getByKey: async () => repositoryError("not_found", "not found") },
      runCandidate: async (input) =>
        repositoryOk({
          status: "completed",
          namespace: input.request.namespace,
          sourceIds: [],
          warnings: ["test_mode_only"],
        }),
    });

    if (!harnessResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: harnessResult.error.code,
          route: "/api/memory/ingest",
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
        route: "/api/memory/ingest",
        status: "test_harness_only",
        authenticated: true,
        namespace: parsed.data.namespace,
        result: harnessResult.data.body,
        message: "Memory ingest test harness completed without production route activation.",
      },
      { status: 200 },
    );
  }

  const contract = assertRouteDisabled("/api/memory/ingest");
  const idempotency = buildDisabledRouteIdempotencyContract(parsed.data.idempotency_key);
  const response_cache = buildDisabledRouteResponseCacheContract();

  return NextResponse.json(
    {
      ok: false,
      code: "not_implemented",
      route: "/api/memory/ingest",
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
}
