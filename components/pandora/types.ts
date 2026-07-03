import type { LucideIcon } from "lucide-react";

export type ColorKey = "emerald" | "indigo" | "blue" | "amber" | "purple" | "red" | "slate";

export type DashboardStatData = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  color: ColorKey;
  sparklineData: number[];
};

export type StatItem = DashboardStatData & {
  icon: LucideIcon;
};

export type MemorySpace = {
  id: "real_life" | "au";
  label: string;
  type: string;
  description: string;
  memories: number;
  people: number;
  projects: number;
  status: "Active" | "Archived" | "Degraded";
  color: ColorKey;
};

export type TimelineEventData = {
  id: string;
  title: string;
  time: string;
  desc: string;
  namespace: "real_life" | "au";
  color: ColorKey;
};

export type TimelineEvent = TimelineEventData & {
  icon: LucideIcon;
};

export type WorkQueueData = {
  needsReview: number;
  openLoops: number;
  stalePacks: number;
  failedTests: number;
  profileRefreshDue: number;
  packSupersessionNeeded: number;
  peopleMapDesignNeeded: number;
};

export type SystemRow = {
  label: string;
  value: string;
  state: "healthy" | "gated" | "attention" | "idle";
};

export type ProfileSnapshot = {
  name: string;
  status: string;
  confidencePercent: number;
  confidenceLabel: string;
  summary: string;
  lastRefreshed: string;
  traits: string[];
  evidence: string;
};

export type PandoraDashboardData = {
  generatedAt: string;
  operatorLabel: string;
  live: boolean;
  warnings: string[];
  hero: {
    title: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
  };
  evidence: string;
  stats: DashboardStatData[];
  memorySpaces: MemorySpace[];
  workQueue: WorkQueueData;
  profileSnapshot: ProfileSnapshot;
  timelineEvents: TimelineEventData[];
  diagnostics: {
    coreSystems: SystemRow[];
    gatedSystems: SystemRow[];
    envelope: {
      title: string;
      description: string;
    };
  };
};
