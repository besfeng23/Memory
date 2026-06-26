import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseBridgeAdminClient } from "@/lib/supabase/bridge-admin";
import type { MemoryBridgePrincipal } from "@/lib/services/memory-bridge-auth";
import type { MemoryBridgeDbClient } from "@/lib/services/memory-bridge-service";

export async function createMemoryBridgeDbClientForPrincipal(principal: MemoryBridgePrincipal): Promise<MemoryBridgeDbClient> {
  if (principal.ok && principal.authType === "bridge_token") {
    return createSupabaseBridgeAdminClient() as unknown as MemoryBridgeDbClient;
  }
  return (await createSupabaseServerClient()) as unknown as MemoryBridgeDbClient;
}
