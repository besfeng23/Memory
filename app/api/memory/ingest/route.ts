import { NextResponse } from "next/server";
import { assertRouteDisabled } from "@/lib/api/route-contracts";

export const dynamic = "force-dynamic";

export function POST() {
  const contract = assertRouteDisabled("/api/memory/ingest");

  return NextResponse.json(
    {
      ok: false,
      code: "not_implemented",
      route: "/api/memory/ingest",
      status: "disabled_stub",
      contract: contract.ok ? contract.data : null,
      message: "Memory ingest is intentionally disabled. This route does not write memory, call models, or touch retrieval state.",
    },
    { status: 501 },
  );
}
