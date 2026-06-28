export type EnvAuditEvent = { action: string; actorUserId?: string | null; key?: string; metadata?: Record<string, unknown>; createdAt: string };
const events: EnvAuditEvent[] = [];
export function recordEnvAuditEvent(event: Omit<EnvAuditEvent, "createdAt">): EnvAuditEvent { const stored = { ...event, createdAt: new Date().toISOString(), metadata: scrub(event.metadata ?? {}) }; events.push(stored); return stored; }
export function listEnvAuditEvents() { return [...events]; }
function scrub(value: unknown): Record<string, unknown> { return JSON.parse(JSON.stringify(value).replace(/[A-Za-z0-9_\-]{24,}/g, "[redacted]")); }
