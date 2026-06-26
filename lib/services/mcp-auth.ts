import { timingSafeEqual } from "node:crypto";
import { verifyPandoraMcpOAuthAccessToken } from "@/lib/services/mcp-oauth";

export type PandoraMcpPrincipal =
  | { ok: true; authType: "mcp_bearer_token" | "mcp_oauth_access_token"; userId: string }
  | { ok: false; status: 401 | 403; code: string; message: string };

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, ...rest] = header.split(" ");
  const token = rest.join(" ").trim();
  return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function resolvePandoraMcpPrincipal(request: Request, env: Partial<NodeJS.ProcessEnv> = process.env): PandoraMcpPrincipal {
  if (env.PANDORA_ENABLE_MCP !== "true") return { ok: false, status: 403, code: "mcp_disabled", message: "Pandora MCP is disabled." };
  const configuredToken = env.PANDORA_MCP_TOKEN;
  const suppliedToken = bearerToken(request);
  if (!configuredToken || !suppliedToken) return { ok: false, status: 401, code: "mcp_token_missing", message: "MCP bearer token is required." };
  if (safeEqual(suppliedToken, configuredToken)) {
    if (!env.PANDORA_MCP_USER_ID) return { ok: false, status: 403, code: "mcp_user_id_missing", message: "Pandora MCP user id is not configured." };
    if (!env.PANDORA_MCP_DB_KEY) return { ok: false, status: 403, code: "mcp_db_key_missing", message: "Pandora MCP database key is not configured." };
    return { ok: true, authType: "mcp_bearer_token", userId: env.PANDORA_MCP_USER_ID };
  }
  const oauth = verifyPandoraMcpOAuthAccessToken(suppliedToken, env);
  if (!oauth.ok) return { ok: false, status: 401, code: "mcp_token_invalid", message: "MCP bearer token is invalid." };
  if (!env.PANDORA_MCP_USER_ID) return { ok: false, status: 403, code: "mcp_user_id_missing", message: "Pandora MCP user id is not configured." };
  if (!env.PANDORA_MCP_DB_KEY) return { ok: false, status: 403, code: "mcp_db_key_missing", message: "Pandora MCP database key is not configured." };
  return { ok: true, authType: "mcp_oauth_access_token", userId: oauth.payload.user_id };
}

export function requirePandoraMcpPrincipal(request: Request, env: Partial<NodeJS.ProcessEnv> = process.env) {
  const principal = resolvePandoraMcpPrincipal(request, env);
  if (!principal.ok) throw Object.assign(new Error(principal.message), principal);
  return principal;
}

export function requireMcpCaptureEnabled(env: Partial<NodeJS.ProcessEnv> = process.env) {
  if (env.PANDORA_ENABLE_MCP_CAPTURE !== "true") return { ok: false as const, status: 403 as const, code: "mcp_capture_disabled", message: "Pandora MCP capture is disabled." };
  return { ok: true as const };
}

export function requireMcpDistillationEnabled(env: Partial<NodeJS.ProcessEnv> = process.env) {
  if (env.PANDORA_ENABLE_MCP_DISTILLATION !== "true") return { ok: false as const, status: 403 as const, code: "mcp_distillation_disabled", message: "Pandora MCP distillation is disabled." };
  return { ok: true as const };
}
