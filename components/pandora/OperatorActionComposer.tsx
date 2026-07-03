"use client";
import { useState } from "react";

export function OperatorActionComposer() {
  const [actionType, setActionType] = useState("verify_namespace_invariants");
  const [namespace, setNamespace] = useState("real_life");
  async function prepare() { await fetch("/api/pandora/operator-actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action_type: actionType, namespace, mode: "dry_run", payload: { source: "operator_action_center" } }) }); window.location.reload(); }
  return <div className="pd-composer"><div className="pd-mini-grid"><label className="pd-mini"><span>Action type</span><select value={actionType} onChange={(e) => setActionType(e.target.value)}><option value="verify_namespace_invariants">verify_namespace_invariants</option><option value="verify_pack_supersession">verify_pack_supersession</option><option value="check_retrieval_eval_status">check_retrieval_eval_status</option><option value="refresh_dashboard_snapshot">refresh_dashboard_snapshot</option><option value="prepare_distill_smoke_plan">prepare_distill_smoke_plan</option><option value="prepare_shadow_context_pack">prepare_shadow_context_pack</option></select></label><label className="pd-mini"><span>Namespace</span><select value={namespace} onChange={(e) => setNamespace(e.target.value)}><option value="real_life">real_life</option><option value="au">au</option></select></label></div><button className="button-link button-link--primary" type="button" onClick={prepare}>Prepare dry-run</button><p className="pd-muted">For prepare_shadow_context_pack: Creates shadow candidate only after approval/execution. No promotion. Only dry-run or queued-only proposals are available. No core memory mutation is available from this card.</p></div>;
}
