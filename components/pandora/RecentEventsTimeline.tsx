import { timelineEvents } from "./mock-data";
import { COLORS, cn } from "./theme";

export function RecentEventsTimeline() {
  return <section className="pd-card pd-timeline-card"><div className="pd-section-head"><div><p className="pd-label">Recent Memory Events</p><h3>Checkpoint timeline</h3></div></div><ol className="pd-timeline">{timelineEvents.map((event) => { const Icon = event.icon; const color = COLORS[event.color]; return <li key={event.id}><div className={cn("pd-timeline-icon", color.iconBg, color.iconText)}><Icon size={16} aria-hidden="true" /></div><div><div className="pd-event-title"><strong>{event.title}</strong><time>{event.time}</time></div><p>{event.desc}</p></div></li>; })}</ol></section>;
}
