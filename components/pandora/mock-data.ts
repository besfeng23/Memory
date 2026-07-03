import { BadgeCheck, Package } from "lucide-react";
import type { MemorySpace, StatItem, SystemRow, WorkQueueData } from "./types";

export const profileSnapshot = { name: "Fixture", status: "Fixture", confidencePercent: 0, confidenceLabel: "N/A", summary: "Fixture", lastRefreshed: "Fixture", traits: ["Fixture"], evidence: "Fixture" } as const;

export const mockStats: StatItem[] = [
  { id: "one", title: "One", value: "0", subtitle: "Fixture", icon: Package, color: "slate", sparklineData: [0] },
];

export const memorySpaces: MemorySpace[] = [
  { id: "real_life", label: "real_life", type: "Primary", description: "Fixture", memories: 0, people: 0, projects: 0, status: "Degraded", color: "emerald" },
  { id: "au", label: "au", type: "Secondary", description: "Fixture", memories: 0, people: 0, projects: 0, status: "Degraded", color: "purple" },
];

export const workQueue: WorkQueueData = { needsReview: 0, openLoops: 0, stalePacks: 0, failedTests: 0, profileRefreshDue: 0, packSupersessionNeeded: 0, peopleMapDesignNeeded: 0 };

export const timelineEvents = [
  { id: "one", icon: BadgeCheck, color: "slate", title: "One", time: "Now", desc: "Fixture" },
];

export const coreSystems: SystemRow[] = [
  { label: "One", value: "OK", state: "healthy" },
];

export const gatedSystems: SystemRow[] = [
  { label: "Two", value: "OK", state: "gated" },
];

export const navItems = ["Dashboard", "Memory Feed", "Context Packs", "Adaptive Profiles", "Open Loops", "People", "Projects", "Retrieval Tests", "Settings"] as const;
export const mobileNavItems = ["Dashboard", "Memory Feed", "Queue", "Profiles", "More"];
