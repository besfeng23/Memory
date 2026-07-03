import type { LucideIcon } from "lucide-react";

export type ColorKey = "emerald" | "indigo" | "blue" | "amber" | "purple" | "red" | "slate";

export type StatItem = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  icon: LucideIcon;
  color: ColorKey;
  sparklineData: number[];
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

export type TimelineEvent = {
  id: string;
  icon: LucideIcon;
  color: ColorKey;
  title: string;
  time: string;
  desc: string;
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
