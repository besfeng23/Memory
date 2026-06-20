import { NextResponse, type NextRequest } from "next/server";
import {
  assertRouteDisabled,
  buildDisabledRouteIdempotencyContract,
  futureMemoryIngestRequestSchema,
} from "@/lib/api/route-contracts";
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

  const contract = assertRouteDisabled("/api/memory/ingest");
  const idempotency = buildDisabledRouteIdempotencyContract(parsed.data.idempotency_key);

  return NextResponse.json(
    {
      ok: false,
      code: "not_implemented",
      route: "/api/memory/ingest",
      status: "disabled_stub",
      authenticated: true,
      namespace: parsed.data.namespace,
      idempotency,
      contract: contract.ok ? contract.data : null,
      message: "Memory ingest is intentionally disabled. This route does not write memory, call models, or touch retrieval state.",
    },
    { status: 501 },
  );
}
