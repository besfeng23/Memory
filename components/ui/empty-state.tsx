import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: Readonly<{ title: string; description: string; action?: ReactNode }>) {
  return (
    <div className="empty-state">
      <p className="empty-state__label">No live data</p>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
