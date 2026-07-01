import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";

export function Topbar() {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Foundation shell</p>
        <p className="topbar__title">Pandora Memory Engine</p>
      </div>
      <div className="topbar__actions" aria-label="Project status">
        <StatusBadge status="foundation" />
        <Link className="button-link" href="/operating">Operating</Link>
        <Link className="button-link" href="/operating/projects">Projects</Link>
        <Link className="button-link" href="/operating/smoke">Smoke</Link>
        <Link className="button-link" href="/api/health">Health</Link>
      </div>
    </header>
  );
}
