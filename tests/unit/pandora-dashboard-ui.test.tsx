import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PandoraDashboard } from "@/components/pandora/PandoraDashboard";
import type { PandoraDashboardData } from "@/components/pandora/types";


const verification = {
  generatedAt: "2026-07-03T00:00:00Z",
  status: "warning" as const,
  namespaces: [
    { namespace: "real_life" as const, status: "pass" as const, activeMasterCount: 1, archivedMasterCount: 1, newestActiveMaster: { id: "rl-pack", namespace: "real_life" as const, packType: "master", status: "active", title: "real", createdAt: "now" }, previousArchivedMaster: { id: "rl-old", namespace: "real_life" as const, packType: "master", status: "archived", title: "old", createdAt: "before" }, duplicateActiveMasterIds: [], warnings: [] },
    { namespace: "au" as const, status: "warning" as const, activeMasterCount: 1, archivedMasterCount: 0, newestActiveMaster: { id: "au-pack", namespace: "au" as const, packType: "master", status: "active", title: "au", createdAt: "now" }, previousArchivedMaster: null, duplicateActiveMasterIds: [], warnings: ["No previous archived/superseded master pack evidence returned for au."] },
  ],
  packSupersession: { status: "warning" as const, namespaces: [], warnings: ["No previous archived/superseded master pack evidence returned for au."] },
  retrievalEval: { status: "not_run" as const, source: "retrieval_logs", latestRunId: null, latestRunAt: null, resultLabel: "Not run", realResultAvailable: false, warnings: ["No retrieval eval/log rows returned for this operator."] },
  auditEvidence: [],
  smokeEvidence: { status: "not_run" as const, latest: null, warnings: ["No smoke evidence exists for this operator session scope."] },
  invariantStatus: { exactlyOneActiveMasterPerNamespace: "pass" as const, noCrossNamespacePackMixing: "pass" as const, noDuplicateActiveMaster: "pass" as const, retrievalEvalHasNoFabricatedScore: "pass" as const, smokeEvidence: "not_run" as const },
  warnings: ["visible warning"],
};

const data: PandoraDashboardData = {
  generatedAt: "2026-07-03T00:00:00Z",
  operatorLabel: "operator@example.com",
  live: true,
  warnings: ["memory_profiles/au read unavailable; showing empty state."],
  hero: { title: "Live title", description: "Live description", primaryAction: "Context pack data live", secondaryAction: "Retrieval eval Gated" },
  evidence: "Live evidence",
  stats: [{ id: "events", title: "Memory Events", value: "2", subtitle: "Authenticated rows", color: "indigo", sparklineData: [1, 1] }, { id: "retrieval", title: "Retrieval Eval", value: "Gated", subtitle: "Semantic gated; no accuracy claim", color: "amber", sparklineData: [0] }],
  memorySpaces: [{ id: "real_life", label: "real_life", type: "Primary Space", description: "Active master context pack: real", memories: 1, people: 2, projects: 3, status: "Active", color: "emerald" }, { id: "au", label: "au", type: "Isolated AU Space", description: "Active master context pack: au", memories: 1, people: 0, projects: 0, status: "Active", color: "purple" }],
  workQueue: { needsReview: 4, openLoops: 5, stalePacks: 0, failedTests: 0, profileRefreshDue: 0, packSupersessionNeeded: 1, peopleMapDesignNeeded: 0 },
  profileSnapshot: { name: "Operator", status: "Live read", confidencePercent: 77, confidenceLabel: "77%", summary: "Live profile", lastRefreshed: "now", traits: ["Authenticated"], evidence: "profile row" },
  timelineEvents: [{ id: "event", title: "real_life • captured", time: "now", desc: "Live event summary", namespace: "real_life", color: "emerald" }],
  diagnostics: { coreSystems: [{ label: "Displayed data", value: "Live reads", state: "healthy" }], gatedSystems: [{ label: "Semantic retrieval", value: "Gated Off", state: "gated" }], envelope: { title: "Dashboard Truth Envelope", description: "Live loader completed" } },
  verification,
  operatorActions: { actions: [], warnings: [] },
};

describe("PandoraDashboard", () => {
  it("renders live values passed by props with gated semantic copy and warnings", () => {
    const html = renderToStaticMarkup(<PandoraDashboard dashboardData={data} />);
    expect(html).toContain("Live RLS Data");
    expect(html).toContain("Semantic Gated");
    expect(html).toContain("Live title");
    expect(html).toContain("Live event summary");
    expect(html).toContain("operator@example.com");
    expect(html).toContain("memory_profiles/au read unavailable");
    expect(html).toContain("Gated Off");
    expect(html).toContain("Operator Verification Console");
    expect(html).toContain("Not run");
    expect(html).toContain("visible warning");
  });
});
