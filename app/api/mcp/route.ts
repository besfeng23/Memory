import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolvePandoraMcpPrincipal } from "@/lib/services/mcp-auth";
import { pandoraMcpPublicOrigin } from "@/lib/services/mcp-oauth";
import { createPandoraMcpServer } from "@/lib/services/pandora-mcp-server";
import type { MemoryBridgeDbClient } from "@/lib/services/memory-bridge-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function corsHeaders(request: Request) {
  const allowed = (process.env.PANDORA_MCP_ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin = allowed.length === 0 ? origin || "*" : allowed.includes(origin) ? origin : "";
  return { ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}), "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS", "Access-Control-Allow-Headers": "authorization,content-type,mcp-protocol-version,mcp-session-id,last-event-id", "Access-Control-Expose-Headers": "mcp-session-id,www-authenticate" };
}

function jsonError(failure: Exclude<ReturnType<typeof resolvePandoraMcpPrincipal>, { ok: true }>, request: Request) {
  const headers = new Headers(corsHeaders(request));
  if (failure.status === 401) {
    const origin = pandoraMcpPublicOrigin(request);
    const path = new URL(request.url).pathname.replace(/\/$/, "");
    headers.set("WWW-Authenticate", `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource${path}"`);
  }
  return NextResponse.json({ ok: false, code: failure.code, message: failure.message }, { status: failure.status, headers });
}

function createMcpClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.PANDORA_MCP_DB_KEY ?? "", { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { "x-pandora-bridge": "phase-4b-mcp" } } }) as unknown as MemoryBridgeDbClient;
}

async function handle(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  const principal = resolvePandoraMcpPrincipal(request);
  if (!principal.ok) return jsonError(principal, request);
  const server = createPandoraMcpServer({ client: createMcpClient(), principal });
  const allowedOrigins = (process.env.PANDORA_MCP_ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, allowedOrigins: allowedOrigins.length ? allowedOrigins : undefined });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export { handle as GET, handle as POST, handle as DELETE, handle as OPTIONS };
