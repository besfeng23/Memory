"use client";

import { Archive, ClipboardList, GitBranch, History, Package, ShieldCheck } from "lucide-react";
import { AdaptiveProfileCard } from "./AdaptiveProfileCard";
import { AskPandoraHero } from "./AskPandoraHero";
import { DiagnosticsCard } from "./DiagnosticsCard";
import { MemorySpacesCard } from "./MemorySpacesCard";
import { MobileBottomNav } from "./MobileBottomNav";
import { RecentEventsTimeline } from "./RecentEventsTimeline";
import { Sidebar } from "./Sidebar";
import { StatCard } from "./StatCard";
import { TopBar } from "./TopBar";
import { VerificationConsoleCard } from "./VerificationConsoleCard";
import { OperatorActionCenterCard } from "./OperatorActionCenterCard";
import { ShadowContextPackLabCard } from "./ShadowContextPackLabCard";
import { WorkQueueCard } from "./WorkQueueCard";
import type { PandoraDashboardData, StatItem } from "./types";
import { useState } from "react";

const statIcons = [History, Package, ShieldCheck, GitBranch, Archive, ClipboardList];

export function PandoraDashboard({ dashboardData }: { dashboardData: PandoraDashboardData }) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const stats: StatItem[] = dashboardData.stats.map((stat, index) => ({ ...stat, icon: statIcons[index] ?? Package }));

  return (
    <div className="pd-shell">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <div className="pd-main">
        <TopBar />
        <main className="pd-content">
          <div className="pd-header-row">
            <div>
              <p className="pd-label">Pandora Dashboard</p>
              <h1>Memory Command Center</h1>
              <p>Authenticated operator view backed by server-side Supabase reads for this session.</p>
            </div>
            <div className="pd-badges">
              <span className="pd-pill pd-pill-emerald">Live RLS Data</span>
              <span className="pd-pill pd-pill-slate">Semantic Gated</span>
            </div>
          </div>
          <AskPandoraHero hero={dashboardData.hero} evidence={dashboardData.evidence} warnings={dashboardData.warnings} />
          <section className="pd-stat-grid" aria-label="Pandora status stats">
            {stats.map((stat) => <StatCard stat={stat} key={stat.id} />)}
          </section>
          <VerificationConsoleCard verification={dashboardData.verification} />
          <OperatorActionCenterCard data={dashboardData.operatorActions} />
          <ShadowContextPackLabCard data={dashboardData.shadowContextPackLab} />
          <div className="pd-dashboard-grid">
            <div className="pd-dashboard-col pd-dashboard-col-wide">
              <MemorySpacesCard spaces={dashboardData.memorySpaces} />
              <RecentEventsTimeline events={dashboardData.timelineEvents} />
            </div>
            <div className="pd-dashboard-col">
              <WorkQueueCard queue={dashboardData.workQueue} />
              <AdaptiveProfileCard profile={dashboardData.profileSnapshot} />
            </div>
            <div className="pd-dashboard-col">
              <DiagnosticsCard diagnostics={dashboardData.diagnostics} />
              <section className="pd-card"><div className="pd-section-head"><div><p className="pd-label">Operator Boundary</p><h3>{dashboardData.operatorLabel}</h3></div></div><div className="pd-mini-grid"><div className="pd-mini"><strong>{dashboardData.memorySpaces.length}</strong><span>namespaces</span></div><div className="pd-mini"><strong>{dashboardData.warnings.length}</strong><span>warnings</span></div><div className="pd-mini"><strong>{dashboardData.live ? "Live" : "No live data"}</strong><span>loader</span></div></div></section>
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav activeNav={activeNav} onNavChange={setActiveNav} />
    </div>
  );
}
