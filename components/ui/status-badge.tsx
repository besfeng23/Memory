import type { ProjectStatus } from "@/lib/app/status";

const labels: Record<ProjectStatus, string> = {
  implemented: "Implemented",
  foundation: "Foundation",
  planned: "Planned",
  stubbed: "Stubbed",
  blocked: "Blocked",
};

export function StatusBadge({ status }: Readonly<{ status: ProjectStatus }>) {
  return <span className={`status-badge status-badge--${status}`}>{labels[status]}</span>;
}
