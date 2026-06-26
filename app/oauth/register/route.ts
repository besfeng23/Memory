import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { PANDORA_MCP_OAUTH_SCOPES } from "@/lib/services/mcp-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }
  const now = Math.floor(Date.now() / 1000);
  return NextResponse.json({
    client_id: `pandora-chatgpt-${randomUUID()}`,
    client_id_issued_at: now,
    token_endpoint_auth_method: "none",
    redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
    grant_types: ["authorization_code"],
    response_types: ["code"],
    scope: typeof body.scope === "string" ? body.scope : PANDORA_MCP_OAUTH_SCOPES
  }, { status: 201, headers: { "Access-Control-Allow-Origin": "*" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "content-type,authorization" } });
}
