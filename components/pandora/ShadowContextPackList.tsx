import type { ShadowContextPackSummary } from "./types";
import { ShadowContextPackDetail } from "./ShadowContextPackDetail";
export function ShadowContextPackList({ packs }: { packs: ShadowContextPackSummary[] }) { if (!packs.length) return <p className="pd-muted">No shadow context-pack candidates staged yet.</p>; return <div className="pd-action-list">{packs.map((pack) => <ShadowContextPackDetail key={pack.id} pack={pack} />)}</div>; }
