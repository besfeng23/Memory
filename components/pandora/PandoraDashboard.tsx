"use client";

import { useEffect, useState } from "react";
import { AskPandoraHero } from "./AskPandoraHero";
import { AdaptiveProfileCard } from "./AdaptiveProfileCard";
import { DiagnosticsCard } from "./DiagnosticsCard";
import { MemorySpacesCard } from "./MemorySpacesCard";
import { MobileBottomNav } from "./MobileBottomNav";
import { mockStats, workQueue } from "./mock-data";
import { RecentEventsTimeline } from "./RecentEventsTimeline";
import { Sidebar } from "./Sidebar";
import { StatCard } from "./StatCard";
import { TopBar } from "./TopBar";
import { WorkQueueCard } from "./WorkQueueCard";

export function PandoraDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [isSimulatingLoad, setIsSimulatingLoad] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSimulatingLoad(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="pd-shell">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <div className="pd-main">
        <TopBar />
        <main className="pd-content">
          <div className="pd-header-row">
            <div><p className="pd-label">Pandora Dashboard</p><h1>Memory Command Center</h1><p>Stable internal engine. Not productized. Ready for evals and pack supersession.</p></div>
            <div className="pd-badges"><span className="pd-pill pd-pill-emerald">V0.4 Stable</span><span className="pd-pill pd-pill-purple">Envelope Live</span><span className="pd-pill pd-pill-slate">Semantic Gated</span></div>
          </div>
          <AskPandoraHero />
          <section className="pd-stat-grid" aria-label="Pandora status stats">{mockStats.map((stat) => <StatCard stat={stat} key={stat.id} />)}</section>
          <section className="pd-dashboard-grid"><div className="pd-column"><WorkQueueCard queue={workQueue} /><MemorySpacesCard /></div><RecentEventsTimeline /><div className="pd-column"><AdaptiveProfileCard loading={isSimulatingLoad} /><DiagnosticsCard loading={isSimulatingLoad} /></div></section>
        </main>
      </div>
      <MobileBottomNav activeNav={activeNav} onNavChange={setActiveNav} />
    </div>
  );
}
