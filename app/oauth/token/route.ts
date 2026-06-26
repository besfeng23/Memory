import { NextResponse } from "next/server";
import { createPandoraMcpAccessToken, pandoraMcpPublicOrigin, verifyPandoraMcpPayload, verifyPkce } from "@/lib/services/mcp-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await request.json() as Record<string, string>;
  const form = await request.formData();
  return Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, String(value)]));
}

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status, headers: { "cache-control": "no-store", pragma: "no-cache", "Access-Control-Allow-Origin": "*" } });
}

export async function POST(request: Request) {
  const body = await readBody(request);
  if (body.grant_type !== "authorization_code") return oauthError("unsupported_grant_type", "Only authorization_code is supported.");
  const code = body.code;
  if (!code) return oauthError("invalid_request", "code is required.");
  const verified = verifyPandoraMcpPayload(code, "pandora_mcp_code", process.env);
  if (!verified.ok) return oauthError("invalid_grant", "Authorization code is invalid or expired.", 401);
  const payload = verified.payload;
  const clientId = body.client_id || payload.client_id || "";
  if (payload.client_id && body.client_id && body.client_id !== payload.client_id) return oauthError("invalid_grant", "client_id mismatch.", 401);
  if (payload.redirect_uri && body.redirect_uri && body.redirect_uri !== payload.redirect_uri) return oauthError("invalid_grant", "redirect_uri mismatch.", 401);
  if (!verifyPkce(body.code_verifier, payload.code_challenge, payload.code_challenge_method)) return oauthError("invalid_grant", "PKCE verification failed.", 401);
  const origin = pandoraMcpPublicOrigin(request);
  const accessToken = createPandoraMcpAccessToken({ issuer: origin, audience: payload.aud || `${origin}/api/mcp`, userId: payload.user_id, clientId, scope: payload.scope }, process.env);
  return NextResponse.json({ access_token: accessToken, token_type: "Bearer", expires_in: 60 * 60 * 24 * 30, scope: payload.scope || "pandora.memory.read pandora.memory.write" }, { headers: { "cache-control": "no-store", pragma: "no-cache", "Access-Control-Allow-Origin": "*" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "content-type,authorization" } });
}
