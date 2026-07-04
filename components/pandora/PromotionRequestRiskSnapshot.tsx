import type { ShadowPackRiskSummary } from "./types";
export function PromotionRequestRiskSnapshot({ risk }: { risk: ShadowPackRiskSummary }) { return <div className="pd-mini"><strong>{risk.status} risk</strong><span>score {risk.score}</span>{risk.reasons?.map((r)=><p key={r}>{r}</p>)}{risk.blockers?.map((b)=><p key={b}>⛔ {b}</p>)}{risk.warnings?.map((w)=><p key={w}>⚠ {w}</p>)}</div>; }
