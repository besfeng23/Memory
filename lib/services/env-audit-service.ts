import { createSupabaseBridgeAdminClient } from "@/lib/supabase/bridge-admin";

export type EnvAuditEvent = {
  action: string;
  actorUserId?: string | null;
  key?: string;
  keyId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  durable: boolean;
  durabilityCode?: "persisted" | "blocked_missing_admin_db_key" | "persist_failed";
};

const events: EnvAuditEvent[] = [];

export async function recordEnvAuditEvent(event: Omit<EnvAuditEvent, "createdAt" | "durable" | "durabilityCode">): Promise<EnvAuditEvent> {
  const stored: EnvAuditEvent = {
    ...event,
    createdAt: new Date().toISOString(),
    metadata: scrub(event.metadata ?? {}),
    durable: false,
    durabilityCode: "blocked_missing_admin_db_key",
  };

  events.push(stored);

  try {
    const client = createSupabaseBridgeAdminClient() as any;
    const { error } = await client.from("env_audit_events").insert({
      project_id: event.projectId ?? null,
      key_id: event.keyId ?? null,
      action: event.action,
      actor_user_id: event.actorUserId ?? null,
      metadata: stored.metadata ?? {},
      created_at: stored.createdAt,
    });
    if (error) {
      stored.durabilityCode = "persist_failed";
      stored.metadata = scrub({ ...(stored.metadata ?? {}), audit_error: error.message });
      return stored;
    }
    stored.durable = true;
    stored.durabilityCode = "persisted";
    return stored;
  } catch (error) {
    stored.durabilityCode = process.env.PANDORA_MEMORY_BRIDGE_DB_KEY ? "persist_failed" : "blocked_missing_admin_db_key";
    stored.metadata = scrub({ ...(stored.metadata ?? {}), audit_error: error instanceof Error ? error.message : "unknown_error" });
    return stored;
  }
}

export function listEnvAuditEvents() {
  return [...events];
}

function scrub(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value).replace(/[A-Za-z0-9_\-]{24,}/g, "[redacted]"));
}
