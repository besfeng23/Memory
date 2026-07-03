import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PandoraDashboard } from "@/components/pandora/PandoraDashboard";
import type { PandoraDashboardData } from "@/components/pandora/types";

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
  });
});
