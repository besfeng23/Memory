import { coreSystems, gatedSystems } from "./mock-data";
import type { SystemRow } from "./types";

function SystemStatusRow({ row }: { row: SystemRow }) { return <div className="pd-system-row"><span>{row.label}</span><strong className={`pd-state-${row.state}`}>{row.value}</strong></div>; }

export function DiagnosticsCard({ loading }: { loading: boolean }) {
  return <section className="pd-card"><div className="pd-section-head"><div><p className="pd-label">Diagnostics</p><h3>Authenticated mock shell only.</h3></div></div>{loading ? <div className="pd-loading" aria-label="Loading diagnostics" /> : <><div className="pd-system-list">{coreSystems.map((row) => <SystemStatusRow row={row} key={row.label} />)}</div><div className="pd-system-list pd-gated-list">{gatedSystems.map((row) => <SystemStatusRow row={row} key={row.label} />)}</div><div className="pd-envelope"><strong>Action Envelope</strong><p>Pending backend proof. Do not treat this UI as live engine evidence.</p></div><button type="button" className="pd-secondary-btn" disabled title="Backend wiring pending">Run Smoke Test</button></>}</section>;
}
