import type { OperatorActionEventSummary } from "./types";
export function OperatorActionTimeline({ events = [] }: { events?: OperatorActionEventSummary[] }) {
  if (events.length === 0) return <p className="pd-muted">No event timeline loaded for this action.</p>;
  return <ol className="pd-timeline-list">{events.map((event) => <li key={event.id}><strong>{event.event_type}</strong><span>{event.created_at}</span><p>{event.message}</p></li>)}</ol>;
}
