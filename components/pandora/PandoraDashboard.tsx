"use client";

import { Package } from "lucide-react";
import { MobileBottomNav } from "./MobileBottomNav";
import { Sidebar } from "./Sidebar";
import { StatCard } from "./StatCard";
import { TopBar } from "./TopBar";
import type { PandoraDashboardData, StatItem } from "./types";
import { useState } from "react";

export function PandoraDashboard({ dashboardData }: { dashboardData: PandoraDashboardData }) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const stats: StatItem[] = dashboardData.stats.map((stat) => ({ ...stat, icon: Package }));

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
          <section className="pd-hero">
            <div>
              <p className="pd-label">Live Truth Boundary</p>
              <h2>{dashboardData.hero.title}</h2>
              <p>{dashboardData.hero.description}</p>
            </div>
            <div className="pd-evidence">{dashboardData.evidence}</div>
          </section>
          <section className="pd-stat-grid" aria-label="Pandora status stats">
            {stats.map((stat) => <StatCard stat={stat} key={stat.id} />)}
          </section>
          <section className="pd-card">
            <div className="pd-section-head"><div><p className="pd-label">Live Snapshot</p><h3>Server scoped state</h3></div></div>
            <div className="pd-mini-grid">
              <div className="pd-mini"><strong>{dashboardData.memorySpaces.length}</strong><span>namespaces</span></div>
              <div className="pd-mini"><strong>{dashboardData.workQueue.openLoops}</strong><span>open loops</span></div>
              <div className="pd-mini"><strong>{dashboardData.workQueue.needsReview}</strong><span>needs review</span></div>
            </div>
            <div className="pd-envelope"><strong>{dashboardData.diagnostics.envelope.title}</strong><p>{dashboardData.diagnostics.envelope.description}</p></div>
          </section>
        </main>
      </div>
      <MobileBottomNav activeNav={activeNav} onNavChange={setActiveNav} />
    </div>
  );
}
