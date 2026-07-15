import type { ShadowPackPreflightSummary } from "./types";
import { ShadowPackDiffViewer } from "./ShadowPackDiffViewer";
import { ShadowPackRiskSummary } from "./ShadowPackRiskSummary";
import { ShadowPackPreflightReviewForm } from "./ShadowPackPreflightReviewForm";
import { ShadowPackPreflightControls } from "./ShadowPackPreflightControls";
import { PromotionRequestCreateButton } from "./PromotionRequestCreateButton";
export function ShadowPackPreflightList({ preflights }: { preflights: ShadowPackPreflightSummary[] }) { if (!preflights.length) return <p className="pd-muted">No shadow pack promotion preflights yet.</p>; return <div className="pd-action-list">{preflights.map((p)=><article className="pd-action-item" key={p.id}><div><p className="pd-label">{p.namespace} • {p.status}</p><h4>Shadow pack {p.shadow_pack_id}</h4><p>Reviewer decision: {p.reviewer_decision ?? "not reviewed"}</p></div><ShadowPackRiskSummary risk={p.risk_summary}/><ShadowPackDiffViewer diff={p.diff_summary}/><p className="pd-muted">Reviewer notes: {p.reviewer_notes || "none"}</p><ShadowPackPreflightReviewForm preflight={p}/>{p.status === "approved_for_promotion" ? <><p className="pd-muted">Promotion request may exist; create/refresh is idempotent for this preflight.</p><PromotionRequestCreateButton preflightId={p.id}/></> : null}<ShadowPackPreflightControls preflight={p}/></article>)}</div>; }
