import { coreSystems, gatedSystems } from "./mock-data";
import type { SystemRow } from "./types";

function SystemStatusRow({ row }: { row: SystemRow }) { return <div className="pd-system-row"><span>{row.label}</span><strong className={`pd-state-${row.state}`}>{row.value}</strong></div>; }

export function DiagnosticsCard({ loading }: { loading: boolean }) {
  return <section className="pd-card"><div className="pd-section-head"><div><p className="pd-label">Diagnostics</p><h3>Core ungated systems operational.</h3></div></div>{loading ? <div className="pd-loading" aria-label="Loading diagnostics" /> : <><div className="pd-system-list">{coreSystems.map((row) => <SystemStatusRow row={row} key={row.label} />)}</div><div className="pd-system-list pd-gated-list">{gatedSystems.map((row) => <SystemStatusRow row={row} key={row.label} />)}</div><div className="pd-envelope"><strong>MCP Envelope</strong><p>Responses now expose ok, request_id, fallback_used, and capped payloads.</p></div><button type="button" className="pd-secondary-btn" disabled title="Backend wiring pending">Run Smoke Test</button></>}</section>;
}
