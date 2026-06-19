import Link from "next/link";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/api/health", label: "Health" },
];

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand">
        <span className="brand-mark">P</span>
        <div>
          <p className="brand-title">Pandora</p>
          <p className="brand-subtitle">Memory Engine</p>
        </div>
      </div>
      <nav className="nav-list">
        {navigation.map((item) => (
          <Link className="nav-link" href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
