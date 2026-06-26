import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createPandoraMcpAuthorizationCode, pandoraMcpPublicOrigin } from "@/lib/services/mcp-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] ?? char));
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function authorizeParams(request: Request) {
  const url = new URL(request.url);
  return {
    response_type: url.searchParams.get("response_type") ?? "",
    client_id: url.searchParams.get("client_id") ?? "",
    redirect_uri: url.searchParams.get("redirect_uri") ?? "",
    state: url.searchParams.get("state") ?? "",
    scope: url.searchParams.get("scope") ?? "pandora.memory.read pandora.memory.write",
    code_challenge: url.searchParams.get("code_challenge") ?? "",
    code_challenge_method: url.searchParams.get("code_challenge_method") ?? "S256",
    resource: url.searchParams.get("resource") ?? ""
  };
}

function formPage(params: ReturnType<typeof authorizeParams>, error?: string) {
  const hidden = Object.entries(params).map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`).join("\n");
  return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Pandora MCP Authorization</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#090909;color:#fff;margin:0;padding:28px}main{max-width:520px;margin:auto}input,button{font:inherit;width:100%;box-sizing:border-box;border-radius:12px;padding:14px;margin-top:12px}input{background:#161616;color:#fff;border:1px solid #444}button{background:#fff;color:#000;border:0;font-weight:700}.err{background:#3b0b0b;color:#ffb4b4;padding:12px;border-radius:12px}.muted{color:#aaa}</style></head><body><main><h1>Authorize Pandora Memory</h1><p class="muted">Enter your private Pandora MCP token to allow ChatGPT to connect to this memory server. Do not use your Supabase database key here.</p>${error ? `<p class="err">${escapeHtml(error)}</p>` : ""}<form method="post">${hidden}<label>Private Pandora MCP token</label><input name="pandora_mcp_token" type="password" autocomplete="one-time-code" required autofocus /><button type="submit">Authorize ChatGPT</button></form></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export function GET(request: Request) {
  const params = authorizeParams(request);
  if (params.response_type !== "code" || !params.redirect_uri) return NextResponse.json({ error: "invalid_request", error_description: "response_type=code and redirect_uri are required" }, { status: 400 });
  return formPage(params);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("pandora_mcp_token") ?? "");
  const configuredToken = process.env.PANDORA_MCP_TOKEN ?? "";
  const params = {
    response_type: String(form.get("response_type") ?? ""),
    client_id: String(form.get("client_id") ?? ""),
    redirect_uri: String(form.get("redirect_uri") ?? ""),
    state: String(form.get("state") ?? ""),
    scope: String(form.get("scope") ?? "pandora.memory.read pandora.memory.write"),
    code_challenge: String(form.get("code_challenge") ?? ""),
    code_challenge_method: String(form.get("code_challenge_method") ?? "S256"),
    resource: String(form.get("resource") ?? "")
  };
  if (!configuredToken || !token || !safeEqual(token, configuredToken)) return formPage(params, "Invalid Pandora MCP token.");
  if (!process.env.PANDORA_MCP_USER_ID) return NextResponse.json({ error: "server_error", error_description: "PANDORA_MCP_USER_ID is not configured" }, { status: 500 });
  let redirect: URL;
  try { redirect = new URL(params.redirect_uri); } catch { return NextResponse.json({ error: "invalid_request", error_description: "Invalid redirect_uri" }, { status: 400 }); }
  if (redirect.protocol !== "https:") return NextResponse.json({ error: "invalid_request", error_description: "redirect_uri must use https" }, { status: 400 });
  const origin = pandoraMcpPublicOrigin(request);
  const code = createPandoraMcpAuthorizationCode({ issuer: origin, audience: params.resource || `${origin}/api/mcp`, userId: process.env.PANDORA_MCP_USER_ID, clientId: params.client_id, redirectUri: params.redirect_uri, codeChallenge: params.code_challenge || undefined, codeChallengeMethod: params.code_challenge_method || undefined, scope: params.scope }, process.env);
  redirect.searchParams.set("code", code);
  if (params.state) redirect.searchParams.set("state", params.state);
  return Response.redirect(redirect.toString(), 302);
}
