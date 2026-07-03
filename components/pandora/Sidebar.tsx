import { Activity, Brain, Circle, FolderKanban, Gauge, History, ListChecks, Settings, Users } from "lucide-react";
import { navItems } from "./mock-data";

const icons = [Gauge, History, FolderKanban, Brain, ListChecks, Users, FolderKanban, Activity, Settings];

export function Sidebar({ activeNav, onNavChange }: { activeNav: string; onNavChange: (item: string) => void }) {
  return (
    <aside className="pd-sidebar" aria-label="Pandora navigation">
      <div className="pd-brand"><div className="pd-brand-mark">P</div><div><strong>Pandora</strong><span>Memory Engine</span></div></div>
      <nav className="pd-nav">
        {navItems.map((item, index) => {
          const Icon = icons[index] ?? Circle;
          const active = item === activeNav;
          return <button type="button" key={item} className={active ? "pd-nav-item pd-nav-item-active" : "pd-nav-item"} aria-current={active ? "page" : undefined} onClick={() => onNavChange(item)}><Icon size={18} aria-hidden="true" />{item}</button>;
        })}
      </nav>
      <div className="pd-sidebar-card"><p className="pd-label">System Status</p><strong>Core ungated systems operational</strong><p>V0.4 hardened internal memory engine. Semantic systems remain gated.</p></div>
    </aside>
  );
}
