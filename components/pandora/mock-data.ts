import { BadgeCheck, Boxes, CircleAlert, Package, RefreshCcw, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
import type { MemorySpace, StatItem, SystemRow, TimelineEvent, WorkQueueData } from "./types";

export const mockStats: StatItem[] = [
  { id: "health", title: "Memory Health", value: "Stable", subtitle: "Ungated systems healthy", icon: ShieldCheck, color: "emerald", sparklineData: [68, 70, 72, 74, 74, 76, 78] },
  { id: "retrieval", title: "Retrieval Accuracy", value: "94.3%", subtitle: "vs last 7 days", trend: "↑ 2.4%", icon: Target, color: "indigo", sparklineData: [82, 84, 83, 88, 90, 92, 94] },
  { id: "profiles", title: "Active Profiles", value: "3", subtitle: "2 active • 1 archived", icon: Users, color: "blue", sparklineData: [2, 2, 3, 3, 3, 3, 3] },
  { id: "loops", title: "Open Loops", value: "2", subtitle: "Needs resolution", icon: RefreshCcw, color: "amber", sparklineData: [5, 4, 4, 3, 2, 2, 2] },
  { id: "envelope", title: "Action Envelope", value: "Live", subtitle: "ok/request_id/fallback", icon: Package, color: "purple", sparklineData: [1, 1, 1, 2, 2, 3, 3] },
];

export const memorySpaces: MemorySpace[] = [
  { id: "real_life", label: "real_life", type: "Primary Space", description: "Business, projects, technical state, personal operating context.", memories: 24182, people: 312, projects: 26, status: "Active", color: "emerald" },
  { id: "au", label: "au", type: "Isolated Space", description: "Alternate-universe context, scenarios, canon, and fictionalized work.", memories: 8741, people: 124, projects: 11, status: "Active", color: "purple" },
];

export const workQueue: WorkQueueData = { needsReview: 4, openLoops: 2, stalePacks: 1, failedTests: 0, profileRefreshDue: 1, packSupersessionNeeded: 1, peopleMapDesignNeeded: 1 };

export const timelineEvents: TimelineEvent[] = [
  { id: "adaptive-v2", icon: BadgeCheck, color: "blue", title: "AU adaptive profile v2 active", time: "1h ago", desc: "Supersession chain verified. Confidence remains 0.88." },
  { id: "envelope", icon: Package, color: "purple", title: "Action envelope deployed", time: "2h ago", desc: "Tool responses now include ok, request_id, and fallback_used." },
  { id: "real-life", icon: Boxes, color: "emerald", title: "real_life pack re-distilled", time: "3h ago", desc: "PLP, Pandora roadmap, and technical context verified without AU bleed." },
  { id: "people-map", icon: CircleAlert, color: "amber", title: "people_map limitation identified", time: "4h ago", desc: "Stoplist reached ceiling. Next real fix is known-people whitelist." },
  { id: "v04", icon: Sparkles, color: "indigo", title: "V0.4 hardening checkpoint", time: "Today", desc: "Payload caps, stream stability, and profile refresh reruns are working." },
];

export const coreSystems: SystemRow[] = [
  { label: "Event pipeline", value: "Healthy", state: "healthy" },
  { label: "Profile engine", value: "Healthy", state: "healthy" },
  { label: "Action envelope", value: "Live", state: "healthy" },
  { label: "Namespace isolation", value: "Enforced", state: "healthy" },
];

export const gatedSystems: SystemRow[] = [
  { label: "Semantic retrieval", value: "Gated Off", state: "gated" },
  { label: "Embeddings", value: "Gated Off", state: "gated" },
  { label: "Model calls", value: "Gated Off", state: "gated" },
  { label: "Pruning", value: "Gated Off", state: "gated" },
];

export const navItems = ["Dashboard", "Memory Feed", "Context Packs", "Adaptive Profiles", "Open Loops", "People", "Projects", "Retrieval Tests", "Settings"];
export const mobileNavItems = ["Dashboard", "Feed", "Queue", "Profiles", "More"];
