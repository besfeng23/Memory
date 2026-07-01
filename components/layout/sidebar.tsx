import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { navItems } from "./nav-items";

const groups = ["Core", "Operating", "AU / Story", "Real-Life", "Operations"] as const;

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <Link className="brand" href="/">
        <span className="brand-mark">P</span>
        <span>
          <span className="brand-title">Pandora</span>
          <span className="brand-subtitle">Memory Engine</span>
        </span>
      </Link>
      <nav className="nav-list">
        {groups.map((group) => (
          <div className="nav-group" key={group}>
            <p className="nav-group__title">{group}</p>
            {navItems.filter((item) => item.group === group).map((item) => (
              <Link className="nav-link" href={item.href} key={item.href} aria-disabled={item.status === "planned"}>
                <span>{item.label}</span>
                <StatusBadge status={item.status} />
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
