import type { NextRequest } from "next/server";
import type { PandoraServerSessionResult } from "@/lib/auth/pandora-server-session-contract";
import { resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";

export type MemoryBridgePrincipal = {
  ok: true;
  userId: string;
  createdBy: string;
  authType: "session" | "bridge_token";
  operator: boolean;
} | {
  ok: false;
  blockers: string[];
};

function hasOperatorCapability(session: PandoraServerSessionResult) {
  const s = session.ok ? session.session : null;
  return Boolean(
    s?.authenticated &&
      (s.isInternalOperator ||
        s.isPersistenceOperator ||
        s.adminCapabilities?.some((capability) => ["memory:bridge", "memory:phase-4a", "memory:capture", "memory:context"].includes(capability))),
  );
}

function bearerToken(request: NextRequest | Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

export async function resolveMemoryBridgePrincipal(
  request: NextRequest | Request,
  env: Partial<NodeJS.ProcessEnv> = process.env,
): Promise<MemoryBridgePrincipal> {
  const configuredToken = env.PANDORA_MEMORY_BRIDGE_TOKEN;
  const tokenUserId = env.PANDORA_MEMORY_BRIDGE_USER_ID;
  const token = bearerToken(request);

  if (configuredToken && token && token === configuredToken) {
    if (!tokenUserId) return { ok: false, blockers: ["bridge_token_user_id_missing"] };
    if (!env.PANDORA_MEMORY_BRIDGE_DB_KEY) return { ok: false, blockers: ["bridge_db_key_missing"] };
    return { ok: true, userId: tokenUserId, createdBy: tokenUserId, authType: "bridge_token", operator: true };
  }

  const session = await resolvePandoraServerSession({ request });
  if (!session.ok) return { ok: false, blockers: ["auth_required"] };
  if (!hasOperatorCapability(session)) return { ok: false, blockers: ["operator_required"] };
  return { ok: true, userId: session.session.userId, createdBy: session.session.userId, authType: "session", operator: true };
}

export function isBridgeTokenConfigured(env: Partial<NodeJS.ProcessEnv> = process.env) {
  return Boolean(env.PANDORA_MEMORY_BRIDGE_TOKEN);
}
