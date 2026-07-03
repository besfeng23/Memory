import { LockKeyhole } from "lucide-react";
import { memorySpaces } from "./mock-data";
import { COLORS, cn } from "./theme";

export function MemorySpacesCard() {
  return <section className="pd-card"><div className="pd-section-head"><div><p className="pd-label">Memory Spaces</p><h3>Namespace separation enforced</h3></div><LockKeyhole size={20} aria-hidden="true" /></div><div className="pd-space-grid">{memorySpaces.map((space) => { const color = COLORS[space.color]; return <button type="button" className={cn("pd-space", color.border)} key={space.id} aria-label={`Open ${space.label} namespace shell`}><div className="pd-card-row"><span className={cn("pd-dot", color.dot)} /><span className="pd-pill">{space.status}</span></div><strong>{space.label}</strong><small>{space.type}</small><p>{space.description}</p><div className="pd-space-metrics"><span>{space.memories.toLocaleString()}<small>memories</small></span><span>{space.people}<small>people</small></span><span>{space.projects}<small>projects</small></span></div></button>; })}</div></section>;
}
