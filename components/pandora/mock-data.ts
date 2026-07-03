import { BadgeCheck, Boxes, CircleAlert, Package, RefreshCcw, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
import type { MemorySpace, StatItem, SystemRow, TimelineEvent, WorkQueueData } from "./types";

export const profileSnapshot = {
  name: "Writer v2",
  status: "Mock only",
  confidencePercent: 0,
  confidenceLabel: "N/A",
  summary: "No live profile data loaded",
  lastRefreshed: "Backend wiring pending",
  traits: ["Mock shell", "Layout review", "Auth gated", "No live counts"],
  evidence: "Mock UI only • no live memories • no retrieval eval • request_id pending wiring",
} as const;

export const mockStats: StatItem[] = [
  { id: "health", title: "Memory Health", value: "Unknown", subtitle: "No live health route wired", icon: ShieldCheck, color: "slate", sparklineData: [0, 0, 0, 0, 0, 0, 0] },
  { id: "retrieval", title: "Retrieval Eval", value: "Gated", subtitle: "No accuracy claim without tests", icon: Target, color: "amber", sparklineData: [0, 0, 0, 0, 0, 0, 0] },
  { id: "profiles", title: "Active Profiles", value: "Mock", subtitle: "No live profile records loaded", icon: Users, color: "blue", sparklineData: [0, 0, 0, 0, 0, 0, 0] },
  { id: "loops", title: "Open Loops", value: "Not wired", subtitle: "Queue UI only", icon: RefreshCcw, color: "amber", sparklineData: [0, 0, 0, 0, 0, 0, 0] },
  { id: "envelope", title: "Action Envelope", value: "Pending proof", subtitle: "Show only after route evidence", icon: Package, color: "purple", sparklineData: [0, 0, 0, 0, 0, 0, 0] },
];

export const memorySpaces: MemorySpace[] = [
  { id: "real_life", label: "real_life", type: "Primary Space", description: "Business, projects, technical state, and personal operating context. Counts stay hidden until backed by authenticated reads.", memories: 0, people: 0, projects: 0, status: "Degraded", color: "emerald" },
  { id: "au", label: "au", type: "Isolated Space", description: "Alternate-universe context, scenarios, canon, and fictionalized work. Counts stay hidden until backed by authenticated reads.", memories: 0, people: 0, projects: 0, status: "Degraded", color: "purple" },
];

export const workQueue: WorkQueueData = { needsReview: 0, openLoops: 0, stalePacks: 0, failedTests: 0, profileRefreshDue: 0, packSupersessionNeeded: 0, peopleMapDesignNeeded: 0 };

export const timelineEvents: TimelineEvent[] = [
  { id: "route-gated", icon: BadgeCheck, color: "emerald", title: "Dashboard route gated", time: "Patch", desc: "Anonymous requests see the operator-session panel, not the dashboard shell." },
  { id: "mock-data", icon: Boxes, color: "slate", title: "Live counts removed", time: "Patch", desc: "The dashboard no longer presents mock memory, people, project, or profile numbers as operational truth." },
  { id: "retrieval-gated", icon: CircleAlert, color: "amber", title: "Retrieval accuracy claim removed", time: "Patch", desc: "Semantic retrieval stays gated until backed by route and test evidence." },
  { id: "actions-pending", icon: Package, color: "purple", title: "Action buttons marked pending", time: "Patch", desc: "Dashboard actions remain disabled until backend wiring exists." },
  { id: "ui-shell", icon: Sparkles, color: "indigo", title: "UI shell preserved", time: "Patch", desc: "The visual layout remains available for authenticated review without pretending to be the engine." },
];

export const coreSystems: SystemRow[] = [
  { label: "Route exposure", value: "Auth gated", state: "healthy" },
  { label: "Displayed data", value: "Mock only", state: "gated" },
  { label: "Profile engine", value: "Not wired", state: "gated" },
  { label: "Action envelope", value: "Pending proof", state: "attention" },
];

export const gatedSystems: SystemRow[] = [
  { label: "Semantic retrieval", value: "Gated Off", state: "gated" },
  { label: "Embeddings", value: "Gated Off", state: "gated" },
  { label: "Model calls", value: "Gated Off", state: "gated" },
  { label: "Pruning", value: "Gated Off", state: "gated" },
];

export const navItems = ["Dashboard", "Memory Feed", "Context Packs", "Adaptive Profiles", "Open Loops", "People", "Projects", "Retrieval Tests", "Settings"] as const;
export const mobileNavItems = ["Dashboard", "Memory Feed", "Queue", "Profiles", "More"] as const;
