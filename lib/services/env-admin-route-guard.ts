import { timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { requireApiUser } from "@/lib/security/api-auth";
import { isBrokerEnabled } from "@/lib/services/env-broker-service";

export const ENV_ADMIN_COOKIE_NAME = "pandora_env_admin";
const ENV_ADMIN_CAPABILITIES = new Set(["env:admin", "env:broker", "admin:env", "pandora:env"]);
const ENV_ADMIN_ROLES = new Set(["admin", "env_admin"]);

export type EnvAdminActor = {
  id: string;
  authType: "supabase" | "operator_token";
};

export async function requireEnvAdmin(mutation = true): Promise<{ user: EnvAdminActor | null; response: NextResponse | null }> {
  let user: EnvAdminActor | null = null;

  if (await hasValidEnvAdminOperatorToken()) {
    user = { id: "env-operator-token", authType: "operator_token" };
  } else {
    const auth = await requireApiUser();
    if (auth.response) {
      return { user: null, response: NextResponse.json({ ok: false, error: { code: "unauthenticated", message: "Env Broker operator unlock required." } }, { status: 401 }) };
    }
    if (!hasEnvAdminCapability(auth.user)) {
      return { user: null, response: NextResponse.json({ ok: false, error: { code: "forbidden", message: "Env Broker admin capability required." } }, { status: 403 }) };
    }
    user = { id: auth.user.id, authType: "supabase" };
  }

  if (!user) {
    return { user: null, response: NextResponse.json({ ok: false, error: { code: "unauthenticated", message: "Env Broker operator unlock required." } }, { status: 401 }) };
  }

  if (mutation && !isBrokerEnabled()) {
    return { user: null, response: NextResponse.json({ ok: false, error: { code: "broker_disabled", message: "Pandora Env Broker is not enabled." } }, { status: 403 }) };
  }

  return { user, response: null };
}

export function hasEnvAdminCapability(user: Pick<User, "app_metadata"> | null | undefined): boolean {
  const metadata = user?.app_metadata;
  if (!metadata || typeof metadata !== "object") return false;

  const role = typeof metadata.role === "string" ? metadata.role : "";
  if (ENV_ADMIN_ROLES.has(role)) return true;

  const capabilities = Array.isArray(metadata.adminCapabilities) ? metadata.adminCapabilities : [];
  const roles = Array.isArray(metadata.roles) ? metadata.roles : [];
  return [...capabilities, ...roles].some((value) => typeof value === "string" && ENV_ADMIN_CAPABILITIES.has(value));
}

export async function hasValidEnvAdminOperatorToken(): Promise<boolean> {
  const configured = getConfiguredOperatorTokens();
  if (!configured.length) return false;

  const headerStore = await headers();
  const cookieStore = await cookies();
  const authHeader = headerStore.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const explicitHeader = headerStore.get("x-pandora-env-admin-token") ?? "";
  const cookieToken = cookieStore.get(ENV_ADMIN_COOKIE_NAME)?.value ?? "";

  return [bearer, explicitHeader, cookieToken].some((candidate) => configured.some((token) => safeEqual(candidate, token)));
}

export function getConfiguredOperatorTokens(): string[] {
  return [process.env.PANDORA_INTERNAL_OPERATOR_TOKEN, process.env.PANDORA_INTERNAL_JOB_TOKEN].filter((value): value is string => Boolean(value && value.length >= 24));
}

export function safeEqual(candidate: string, expected: string): boolean {
  if (!candidate || !expected) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
