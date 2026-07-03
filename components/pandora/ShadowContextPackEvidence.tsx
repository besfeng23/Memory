import type { ShadowContextPackSummary } from "./types";
export function ShadowContextPackEvidence({ pack }: { pack: ShadowContextPackSummary }) { return <div className="pd-warning-list"><p><strong>Evidence summary:</strong> {String(pack.candidate_payload.evidence_summary ?? pack.summary)}</p>{pack.warnings.map((w) => <p key={w}>⚠ {w}</p>)}</div>; }
