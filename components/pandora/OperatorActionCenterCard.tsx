import type { OperatorActionCenterData } from "./types";
import { OperatorActionComposer } from "./OperatorActionComposer";
import { OperatorActionList } from "./OperatorActionList";

export function OperatorActionCenterCard({ data }: { data: OperatorActionCenterData }) {
  return <section className="pd-card"><div className="pd-section-head"><div><p className="pd-label">Operator Action Center</p><h3>Controlled proposals and dry-runs</h3><p>Safe operator workflow foundation: action proposals, idempotency, audit events, and visible history with zero destructive memory mutation.</p></div><span className="pd-pill pd-pill-amber">Live actions gated</span></div><OperatorActionComposer /><OperatorActionList actions={data.actions} />{data.warnings.length > 0 ? <div className="pd-warning-list">{data.warnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</div> : null}</section>;
}
