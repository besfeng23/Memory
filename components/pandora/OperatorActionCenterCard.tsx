import type { OperatorActionCenterData } from "./types";
import { OperatorActionComposer } from "./OperatorActionComposer";
import { OperatorActionList } from "./OperatorActionList";

const emptyCounts = { proposed: 0, dry_ran: 0, approved: 0, executing: 0, completed: 0, blocked: 0, failed: 0, cancelled: 0 };
export function OperatorActionCenterCard({ data }: { data: OperatorActionCenterData }) {
  const countsByStatus = data.countsByStatus ?? emptyCounts;
  return <section className="pd-card"><div className="pd-section-head"><div><p className="pd-label">Operator Action Center</p><h3>Approval-gated read-only runner</h3><p>Safe operator workflow: proposals, dry-runs, approval, read-only execution, idempotency, audit events, and visible history with zero destructive memory mutation.</p></div><span className="pd-pill pd-pill-amber">Live actions gated</span></div><div className="pd-mini-grid">{Object.entries(countsByStatus).map(([status,count]) => <div className="pd-mini" key={status}><strong>{count}</strong><span>{status}</span></div>)}</div><OperatorActionComposer /><OperatorActionList actions={data.actions} />{data.warnings.length > 0 ? <div className="pd-warning-list">{data.warnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</div> : null}</section>;
}
