import type { PersistedMemoryBrowserAuditView } from "@/lib/api/persisted-memory-browser-dto";
import { NotAvailable } from "./ProofStatus";

export function MemoryAuditTrail({ events }: Readonly<{ events: PersistedMemoryBrowserAuditView[] }>) {
  return <section className="section-card"><h2>Audit trail panel</h2>{events.length === 0 ? <p>No audit events are available for the selected item, or the audit table/fields are unavailable to this authenticated read.</p> : <ol>{events.map((e) => <li key={e.id}><strong>{e.action}</strong><dl><dt>Timestamp</dt><dd><NotAvailable value={e.createdAt} /></dd><dt>Actor/user id</dt><dd><NotAvailable value={e.actorUserId} /></dd><dt>Operation</dt><dd>{e.action}</dd><dt>Namespace</dt><dd><NotAvailable value={e.namespace} /></dd><dt>Row id</dt><dd><NotAvailable value={e.recordId} /></dd><dt>Source/proof reference</dt><dd><NotAvailable value={e.proofRef ?? e.sourceRef} /></dd></dl><p>{e.summary ?? `${e.tableName ?? "record"} ${e.recordId ?? ""}`}</p></li>)}</ol>}</section>;
}
