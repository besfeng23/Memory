"use client";
import type { OperatorActionSummary } from "./types";

async function postAction(actionId: string, verb: "dry-run" | "approve" | "execute" | "cancel") {
  await fetch(`/api/pandora/operator-actions/${actionId}/${verb}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
  window.location.reload();
}

export function OperatorActionControls({ action }: { action: OperatorActionSummary }) {
  const terminal = ["completed", "failed", "cancelled"].includes(action.status);
  return <div className="pd-action-controls">
    {action.status === "proposed" ? <button className="button-link" type="button" onClick={() => postAction(action.id, "dry-run")}>Prepare dry-run</button> : null}
    {(action.status === "proposed" || action.status === "dry_ran") ? <button className="button-link button-link--primary" type="button" onClick={() => postAction(action.id, "approve")}>Approve</button> : null}
    {action.status === "approved" ? <button className="button-link button-link--primary" type="button" onClick={() => postAction(action.id, "execute")}>Execute approved read-only action</button> : null}
    {!terminal && action.status !== "executing" ? <button className="button-link" type="button" onClick={() => postAction(action.id, "cancel")}>Cancel</button> : null}
  </div>;
}
