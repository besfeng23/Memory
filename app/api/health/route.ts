import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    project: "pandora-memory-engine",
    status: "foundation-ready",
    authSessionStructureImplemented: true,
    memoryEngineImplemented: false,
    databaseSchemaImplemented: false,
    openAiIntegrationImplemented: false,
  });
}
