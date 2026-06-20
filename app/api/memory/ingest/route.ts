import { NextResponse } from "next/server";
import { assertRouteDisabled } from "@/lib/api/route-contracts";
import { getCurrentUser } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

export async function POST() {
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

  const contract = assertRouteDisabled("/api/memory/ingest");

  return NextResponse.json(
    {
      ok: false,
      code: "not_implemented",
      route: "/api/memory/ingest",
      status: "disabled_stub",
      authenticated: true,
      contract: contract.ok ? contract.data : null,
      message: "Memory ingest is intentionally disabled. This route does not write memory, call models, or touch retrieval state.",
    },
    { status: 501 },
  );
}
