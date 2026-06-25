import type { ProjectStatus } from "@/lib/app/status";

export type NavItem = {
  label: string;
  href: string;
  status: ProjectStatus;
  group: "Core" | "AU / Story" | "Real-Life" | "Operations";
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", status: "implemented", group: "Core" },
  { label: "Memory Search", href: "/memory/search", status: "planned", group: "Core" },
  { label: "Memory Timeline", href: "/memory/timeline", status: "planned", group: "Core" },
  { label: "Review Queue", href: "/memory/review", status: "planned", group: "Core" },
  { label: "Phase 3B Admin Browser", href: "/admin/memory/browser?namespace=real_life", status: "implemented", group: "Core" },
  { label: "AU Worlds", href: "/au/worlds", status: "planned", group: "AU / Story" },
  { label: "Character Bible", href: "/au/characters", status: "planned", group: "AU / Story" },
  { label: "Relationship State", href: "/au/relationships", status: "planned", group: "AU / Story" },
  { label: "Scene Timeline", href: "/au/scenes", status: "planned", group: "AU / Story" },
  { label: "Canon Conflicts", href: "/au/canon-conflicts", status: "planned", group: "AU / Story" },
  { label: "Retcon Manager", href: "/au/retcons", status: "planned", group: "AU / Story" },
  { label: "Real-Life People", href: "/real/people", status: "planned", group: "Real-Life" },
  { label: "Business / Deal Memory", href: "/real/business", status: "planned", group: "Real-Life" },
  { label: "Risks and Promises", href: "/real/risks-promises", status: "planned", group: "Real-Life" },
  { label: "Audit Logs", href: "/audit", status: "planned", group: "Operations" },
  { label: "Settings", href: "/settings", status: "planned", group: "Operations" },
  { label: "API / Integrations", href: "/integrations", status: "planned", group: "Operations" },
  { label: "Health", href: "/api/health", status: "implemented", group: "Operations" },
];
