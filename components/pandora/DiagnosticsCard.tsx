import type { PandoraDashboardData, SystemRow } from "./types";

function SystemStatusRow({ row }: { row: SystemRow }) { return <div className="pd-system-row"><span>{row.label}</span><strong className={`pd-state-${row.state}`}>{row.value}</strong></div>; }

export function DiagnosticsCard({ diagnostics, loading = false }: { diagnostics: PandoraDashboardData["diagnostics"]; loading?: boolean }) {
  return <section className="pd-card"><div className="pd-section-head"><div><p className="pd-label">Diagnostics</p><h3>Live RLS Data</h3></div></div>{loading ? <div className="pd-loading" aria-label="Loading diagnostics" /> : <><div className="pd-system-list">{diagnostics.coreSystems.map((row) => <SystemStatusRow row={row} key={row.label} />)}</div><div className="pd-system-list pd-gated-list">{diagnostics.gatedSystems.map((row) => <SystemStatusRow row={row} key={row.label} />)}</div><div className="pd-envelope"><strong>{diagnostics.envelope.title}</strong><p>{diagnostics.envelope.description}</p></div><button type="button" className="pd-secondary-btn" disabled title="Smoke tests run outside the dashboard">Run Smoke Test</button></>}</section>;
}
