import { AlertCircle, GitMerge, ListChecks, UserRoundSearch } from "lucide-react";
import type { WorkQueueData } from "./types";

function MiniMetric({ label, value }: { label: string; value: number }) { return <div className="pd-mini"><strong>{value}</strong><span>{label}</span></div>; }

export function WorkQueueCard({ queue }: { queue: WorkQueueData }) {
  const total = Object.values(queue).reduce((sum, value) => sum + value, 0);
  const items = [
    { label: "Open Loops", value: queue.openLoops, desc: "Needs resolution", icon: AlertCircle },
    { label: "Needs Review", value: queue.needsReview, desc: "Operator review pending", icon: ListChecks },
    { label: "Pack Supersession", value: queue.packSupersessionNeeded, desc: "Master-pack cleanup needed", icon: GitMerge },
    { label: "People Map Design", value: queue.peopleMapDesignNeeded, desc: "Stoplist ceiling reached; whitelist needed.", icon: UserRoundSearch },
  ];
  return <section className="pd-card"><div className="pd-section-head"><div><p className="pd-label">Work Queue</p><h3>{total} actionable items</h3></div><span className="pd-pill pd-pill-amber">Attention</span></div><div className="pd-queue-list">{items.map((item) => { const Icon = item.icon; return <div className="pd-queue-item" key={item.label}><Icon size={18} aria-hidden="true" /><div><strong>{item.label}</strong><p>{item.desc}</p></div><b>{item.value}</b></div>; })}</div><div className="pd-mini-grid"><MiniMetric label="Stale Packs" value={queue.stalePacks} /><MiniMetric label="Refresh Due" value={queue.profileRefreshDue} /><MiniMetric label="Failed Tests" value={queue.failedTests} /></div></section>;
}
