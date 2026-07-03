"use client";

import { AlertCircle, BadgeCheck, Boxes, GitMerge, ListChecks, Package, RefreshCcw, ShieldCheck, Target, UserRoundSearch, Users } from "lucide-react";
import { AskPandoraHero } from "./AskPandoraHero";
import { AdaptiveProfileCard } from "./AdaptiveProfileCard";
import { DiagnosticsCard } from "./DiagnosticsCard";
import { MemorySpacesCard } from "./MemorySpacesCard";
import { MobileBottomNav } from "./MobileBottomNav";
import { RecentEventsTimeline } from "./RecentEventsTimeline";
import { Sidebar } from "./Sidebar";
import { StatCard } from "./StatCard";
import { TopBar } from "./TopBar";
import { WorkQueueCard } from "./WorkQueueCard";
import type { DashboardStatData, PandoraDashboardData, StatItem } from "./types";
import { useState } from "react";

const statIcons = {
  events: Boxes,
  packs: Package,
  reviewed: BadgeCheck,
  loops: RefreshCcw,
  retrieval: Target,
  queue: ListChecks,
  health: ShieldCheck,
  profiles: Users,
  supersede: GitMerge,
  attention: AlertCircle,
  people: UserRoundSearch,
} as const;

function withIcon(stat: DashboardStatData): StatItem {
  const Icon = statIcons[stat.id as keyof typeof statIcons] ?? Package;
  return { ...stat, icon: Icon };
}

export function PandoraDashboard({ dashboardData }: { dashboardData: PandoraDashboardData }) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const stats = dashboardData.stats.map(withIcon);

  return (
    <div className="pd-shell">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <div className="pd-main">
        <TopBar operatorLabel={dashboardData.operatorLabel} generatedAt={dashboardData.generatedAt} />
        <main className="pd-content">
          <div className="pd-header-row">
            <div>
              <p className="pd-label">Pandora Dashboard</p>
              <h1>Memory Command Center</h1>
              <p>Authenticated operator view. Live Supabase reads for memory state; gated intelligence stays explicit.</p>
            </div>
            <div className="pd-badges">
              <span className="pd-pill pd-pill-emerald">Live RLS Data</span>
              <span className="pd-pill pd-pill-purple">Envelope Proven</span>
              <span className="pd-pill pd-pill-slate">Semantic Gated</span>
            </div>
          </div>
          <AskPandoraHero data={dashboardData.hero} evidence={dashboardData.evidence} warnings={dashboardData.warnings} />
          <section className="pd-stat-grid" aria-label="Pandora status stats">{stats.map((stat) => <StatCard stat={stat} key={stat.id} />)}</section>
          <section className="pd-dashboard-grid">
            <div className="pd-column"><WorkQueueCard queue={dashboardData.workQueue} live={dashboardData.live} /><MemorySpacesCard spaces={dashboardData.memorySpaces} /></div>
            <RecentEventsTimeline events={dashboardData.timelineEvents} />
            <div className="pd-column"><AdaptiveProfileCard profile={dashboardData.profileSnapshot} /><DiagnosticsCard diagnostics={dashboardData.diagnostics} /></div>
          </section>
        </main>
      </div>
      <MobileBottomNav activeNav={activeNav} onNavChange={setActiveNav} />
    </div>
  );
}
