import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

function requiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "PANDORA_MEMORY_BRIDGE_DB_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createSupabaseBridgeAdminClient() {
  return createClient<Database>(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("PANDORA_MEMORY_BRIDGE_DB_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "x-pandora-bridge": "phase-4a",
        },
      },
    },
  );
}
