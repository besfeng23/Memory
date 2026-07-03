import { Package } from "lucide-react";
import type { MemorySpace, PandoraDashboardData, StatItem, SystemRow, TimelineEventData, WorkQueueData } from "./types";

export const profileSnapshot = { name: "Fixture", status: "Mock only", confidencePercent: 0, confidenceLabel: "No live data", summary: "No live data fixture profile.", lastRefreshed: "No live data", traits: ["Fixture", "Mock only"], evidence: "No live data" };

export const mockStats: StatItem[] = [
  { id: "fixture", title: "Fixture", value: "No live data", subtitle: "Mock only", icon: Package, color: "slate", sparklineData: [0, 0] },
];

export const memorySpaces: MemorySpace[] = [
  { id: "real_life", label: "real_life", type: "Fixture", description: "Mock only: no live data.", memories: 0, people: 0, projects: 0, status: "Degraded", color: "emerald" },
  { id: "au", label: "au", type: "Fixture", description: "Mock only: no live data.", memories: 0, people: 0, projects: 0, status: "Degraded", color: "purple" },
];

export const workQueue: WorkQueueData = { needsReview: 0, openLoops: 0, stalePacks: 0, failedTests: 0, profileRefreshDue: 0, packSupersessionNeeded: 0, peopleMapDesignNeeded: 0 };
export const timelineEvents: TimelineEventData[] = [{ id: "fixture", color: "slate", title: "Fixture", time: "No live data", desc: "Mock only", namespace: "real_life" }];
export const coreSystems: SystemRow[] = [{ label: "Fixture", value: "No live data", state: "idle" }];
export const gatedSystems: SystemRow[] = [{ label: "Semantic retrieval", value: "Gated", state: "gated" }];
const verification = { generatedAt: "No live data", status: "not_run" as const, namespaces: [], packSupersession: { status: "not_run" as const, namespaces: [], warnings: ["Mock only"] }, retrievalEval: { status: "not_run" as const, source: "fixture", latestRunId: null, latestRunAt: null, resultLabel: "Not run", realResultAvailable: false, warnings: ["Mock only"] }, auditEvidence: [], smokeEvidence: { status: "not_run" as const, latest: null, warnings: ["Mock only"] }, invariantStatus: { exactlyOneActiveMasterPerNamespace: "not_run" as const, noCrossNamespacePackMixing: "not_run" as const, noDuplicateActiveMaster: "not_run" as const, retrievalEvalHasNoFabricatedScore: "pass" as const, smokeEvidence: "not_run" as const }, warnings: ["Mock only"] };
export const fixtureDashboardData: PandoraDashboardData = { generatedAt: "No live data", operatorLabel: "Fixture", live: false, warnings: ["Mock only"], hero: { title: "Fixture dashboard", description: "Mock only: no live data.", primaryAction: "No live data", secondaryAction: "Semantic gated" }, evidence: "No live data", stats: [{ id: "fixture", title: "Fixture", value: "No live data", subtitle: "Mock only", color: "slate", sparklineData: [0, 0] }], memorySpaces, workQueue, profileSnapshot, timelineEvents, diagnostics: { coreSystems, gatedSystems, envelope: { title: "Fixture", description: "Mock only: no live data." } }, verification, operatorActions: { actions: [], warnings: [], countsByStatus: { proposed: 0, dry_ran: 0, approved: 0, executing: 0, completed: 0, blocked: 0, failed: 0, cancelled: 0 } } };

