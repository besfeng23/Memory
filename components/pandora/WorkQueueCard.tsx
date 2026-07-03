import { AlertCircle, GitMerge, ListChecks, UserRoundSearch } from "lucide-react";
import type { WorkQueueData } from "./types";

function MiniMetric({ label, value }: { label: string; value: number }) { return <div className="pd-mini"><strong>{value}</strong><span>{label}</span></div>; }

export function WorkQueueCard({ queue }: { queue: WorkQueueData }) {
  const total = Object.values(queue).reduce((sum, value) => sum + value, 0);
  const items = [
    { label: "Open Loops", value: queue.openLoops, desc: "Live open-loop rows needing operator follow-up", icon: AlertCircle },
    { label: "Needs Review", value: queue.needsReview, desc: "Live capture/review rows awaiting review", icon: ListChecks },
    { label: "Pack Supersession", value: queue.packSupersessionNeeded, desc: "Duplicate active master packs requiring attention", icon: GitMerge },
    { label: "People Map Design", value: queue.peopleMapDesignNeeded, desc: "No fabricated people-map work is created", icon: UserRoundSearch },
  ];
  return <section className="pd-card"><div className="pd-section-head"><div><p className="pd-label">Work Queue</p><h3>{total} actionable items</h3></div><span className="pd-pill pd-pill-emerald">Live RLS Data</span></div><div className="pd-queue-list">{items.map((item) => { const Icon = item.icon; return <div className="pd-queue-item" key={item.label}><Icon size={18} aria-hidden="true" /><div><strong>{item.label}</strong><p>{item.desc}</p></div><b>{item.value}</b></div>; })}</div><div className="pd-mini-grid"><MiniMetric label="Pruning Review" value={queue.stalePacks} /><MiniMetric label="Profile Missing" value={queue.profileRefreshDue} /><MiniMetric label="Failed Tests" value={queue.failedTests} /></div></section>;
}
