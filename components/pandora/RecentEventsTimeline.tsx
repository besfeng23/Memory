import { BadgeCheck } from "lucide-react";
import type { TimelineEventData } from "./types";
import { COLORS, cn } from "./theme";

export function RecentEventsTimeline({ events }: { events: TimelineEventData[] }) {
  return <section className="pd-card pd-timeline-card"><div className="pd-section-head"><div><p className="pd-label">Recent Memory Events</p><h3>Checkpoint timeline</h3></div></div><ol className="pd-timeline">{events.length ? events.map((event) => { const color = COLORS[event.color]; return <li key={event.id}><div className={cn("pd-timeline-icon", color.iconBg, color.iconText)}><BadgeCheck size={16} aria-hidden="true" /></div><div><div className="pd-event-title"><strong>{event.title}</strong><time>{event.time}</time></div><p>{event.desc}</p></div></li>; }) : <li><div className="pd-timeline-icon pd-icon-bg-slate pd-icon-text-slate"><BadgeCheck size={16} aria-hidden="true" /></div><div><div className="pd-event-title"><strong>No live events returned</strong><time>Empty state</time></div><p>No timeline rows are fabricated.</p></div></li>}</ol></section>;
}
