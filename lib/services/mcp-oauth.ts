import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const PANDORA_MCP_OAUTH_SCOPES = "pandora.memory.read pandora.memory.write";

type SignedPayload = {
  typ: "pandora_mcp_code" | "pandora_mcp_access";
  iss: string;
  aud: string;
  user_id: string;
  client_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  scope?: string;
  iat: number;
  exp: number;
  nonce: string;
};

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function decodeBase64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function pandoraMcpPublicOrigin(request: Request, env: Partial<NodeJS.ProcessEnv> = process.env) {
  return (env.PANDORA_MCP_PUBLIC_ORIGIN || new URL(request.url).origin).replace(/\/$/, "");
}

function signingSecret(env: Partial<NodeJS.ProcessEnv>) {
  return env.PANDORA_MCP_OAUTH_SIGNING_SECRET || env.PANDORA_MCP_TOKEN || "";
}

export function signPandoraMcpPayload(payload: SignedPayload, env: Partial<NodeJS.ProcessEnv> = process.env) {
  const secret = signingSecret(env);
  if (!secret) throw new Error("mcp_oauth_signing_secret_missing");
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPandoraMcpPayload(token: string, expectedType: SignedPayload["typ"], env: Partial<NodeJS.ProcessEnv> = process.env) {
  const secret = signingSecret(env);
  if (!secret) return { ok: false as const, code: "mcp_oauth_signing_secret_missing" };
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false as const, code: "mcp_oauth_token_malformed" };
  const expectedSig = createHmac("sha256", secret).update(body).digest("base64url");
  if (!safeEqual(sig, expectedSig)) return { ok: false as const, code: "mcp_oauth_token_invalid" };
  try {
    const payload = JSON.parse(decodeBase64url(body)) as SignedPayload;
    if (payload.typ !== expectedType) return { ok: false as const, code: "mcp_oauth_token_wrong_type" };
    if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false as const, code: "mcp_oauth_token_expired" };
    if (env.PANDORA_MCP_USER_ID && payload.user_id !== env.PANDORA_MCP_USER_ID) return { ok: false as const, code: "mcp_oauth_user_mismatch" };
    return { ok: true as const, payload };
  } catch {
    return { ok: false as const, code: "mcp_oauth_token_invalid_json" };
  }
}

export function verifyPandoraMcpOAuthAccessToken(token: string, env: Partial<NodeJS.ProcessEnv> = process.env) {
  return verifyPandoraMcpPayload(token, "pandora_mcp_access", env);
}

export function createPandoraMcpAuthorizationCode(input: { issuer: string; audience: string; userId: string; clientId?: string; redirectUri: string; codeChallenge?: string; codeChallengeMethod?: string; scope?: string }, env: Partial<NodeJS.ProcessEnv> = process.env) {
  const now = Math.floor(Date.now() / 1000);
  return signPandoraMcpPayload({ typ: "pandora_mcp_code", iss: input.issuer, aud: input.audience, user_id: input.userId, client_id: input.clientId, redirect_uri: input.redirectUri, code_challenge: input.codeChallenge, code_challenge_method: input.codeChallengeMethod, scope: input.scope, iat: now, exp: now + 300, nonce: randomUUID() }, env);
}

export function createPandoraMcpAccessToken(input: { issuer: string; audience: string; userId: string; clientId?: string; scope?: string }, env: Partial<NodeJS.ProcessEnv> = process.env) {
  const now = Math.floor(Date.now() / 1000);
  return signPandoraMcpPayload({ typ: "pandora_mcp_access", iss: input.issuer, aud: input.audience, user_id: input.userId, client_id: input.clientId, scope: input.scope || PANDORA_MCP_OAUTH_SCOPES, iat: now, exp: now + 60 * 60 * 24 * 30, nonce: randomUUID() }, env);
}

export function verifyPkce(codeVerifier: string | undefined, codeChallenge: string | undefined, method: string | undefined) {
  if (!codeChallenge) return true;
  if (!codeVerifier) return false;
  if (!method || method.toUpperCase() === "S256") {
    const hashed = createHash("sha256").update(codeVerifier).digest("base64url");
    return safeEqual(hashed, codeChallenge);
  }
  if (method.toLowerCase() === "plain") return safeEqual(codeVerifier, codeChallenge);
  return false;
}

export function oauthMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    scopes_supported: ["pandora.memory.read", "pandora.memory.write"]
  };
}

export function protectedResourceMetadata(origin: string, resourcePath = "/api/mcp") {
  const resource = `${origin}${resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`}`.replace(/\/$/, "");
  return {
    resource,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: ["pandora.memory.read", "pandora.memory.write"],
    resource_documentation: `${origin}/admin/memory/bridge`
  };
}
