import type { OperatorActionSummary } from "./types";

export function OperatorActionEnvelope({ action }: { action: OperatorActionSummary }) {
  const result = action.result ?? {};
  const noMutation = result.no_mutation_performed === true || JSON.stringify(result).includes('"no_mutation_performed":true');
  return (
    <div className="pd-evidence-box">
      <div className="pd-mini-grid">
        <div className="pd-mini"><strong>{action.request_id}</strong><span>request_id</span></div>
        <div className="pd-mini"><strong>{action.idempotency_key.slice(0, 12)}…</strong><span>idempotency</span></div>
        <div className="pd-mini"><strong>{noMutation ? "Yes" : "Pending"}</strong><span>No mutation performed</span></div>
      </div>
      {action.warnings.length > 0 ? <div className="pd-warning-list">{action.warnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</div> : <p className="pd-muted">No warnings recorded for this action.</p>}
    </div>
  );
}
