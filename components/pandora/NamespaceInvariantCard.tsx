import type { NamespaceVerificationSummary } from "./types";

export function NamespaceInvariantCard({ namespaces }: { namespaces: NamespaceVerificationSummary[] }) {
  return <section className="pd-card"><div className="pd-section-head"><div><p className="pd-label">Namespace invariants</p><h3>real_life and au isolation</h3></div></div><div className="pd-mini-grid">{namespaces.map((item) => <div className="pd-mini" key={item.namespace}><strong>{item.namespace}</strong><span>Status: {item.status}</span><span>Active masters: {item.activeMasterCount}</span><span>Archived masters: {item.archivedMasterCount}</span>{item.duplicateActiveMasterIds.length > 0 ? <span>Duplicate active: {item.duplicateActiveMasterIds.join(", ")}</span> : null}{item.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>)}</div></section>;
}
