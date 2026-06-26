import { NextResponse } from "next/server";
import { oauthMetadata, pandoraMcpPublicOrigin } from "@/lib/services/mcp-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  return NextResponse.json(oauthMetadata(pandoraMcpPublicOrigin(request)), { headers: { "Access-Control-Allow-Origin": "*" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "content-type,authorization" } });
}
