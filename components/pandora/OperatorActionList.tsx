import type { OperatorActionSummary } from "./types";
import { OperatorActionEnvelope } from "./OperatorActionEnvelope";

const colors: Record<string, string> = { proposed: "slate", dry_ran: "emerald", queued: "blue", blocked: "amber", completed: "emerald", failed: "red", cancelled: "slate" };

export function OperatorActionList({ actions }: { actions: OperatorActionSummary[] }) {
  if (actions.length === 0) return <div className="pd-empty"><strong>No operator actions yet.</strong><span>Prepare a safe dry-run proposal to create action history.</span></div>;
  return <div className="pd-list">{actions.map((action) => <article className="pd-list-item" key={action.id}><div className="pd-section-head"><div><p className="pd-label">{action.action_type}</p><h4>{action.title}</h4><p>{action.description}</p></div><span className={`pd-pill pd-pill-${colors[action.status] ?? "slate"}`}>{action.status}</span></div><div className="pd-mini-grid"><div className="pd-mini"><strong>{action.namespace ?? "global"}</strong><span>namespace</span></div><div className="pd-mini"><strong>{action.mode}</strong><span>mode</span></div><div className="pd-mini"><strong>{action.created_at}</strong><span>created</span></div><div className="pd-mini"><strong>{action.updated_at}</strong><span>updated</span></div></div><OperatorActionEnvelope action={action} /></article>)}</div>;
}
