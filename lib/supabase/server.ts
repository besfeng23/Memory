import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";
import { requireSupabasePublicKey } from "@/lib/supabase/public-key";
import { createSupabaseBridgeAdminClient } from "@/lib/supabase/bridge-admin";

function getRequiredServerEnv(name: "NEXT_PUBLIC_SUPABASE_URL") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function isBridgeRequest() {
  const configuredToken = process.env.PANDORA_MEMORY_BRIDGE_TOKEN;
  const dbKeyConfigured = Boolean(process.env.PANDORA_MEMORY_BRIDGE_DB_KEY);
  const bridgeGateEnabled = process.env.PANDORA_ENABLE_CHATGPT_ACTION_BRIDGE === "true";

  if (!configuredToken || !dbKeyConfigured || !bridgeGateEnabled) return false;

  const headerStore = await headers();
  const authorization = headerStore.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token === configuredToken;
}

export async function createSupabaseServerClient() {
  if (await isBridgeRequest()) {
    return createSupabaseBridgeAdminClient();
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireSupabasePublicKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            return;
          }
        },
      },
    },
  );
}
