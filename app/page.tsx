import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { safetyRules } from "@/lib/app/status";

export default function HomePage() {
  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="Pandora foundation"
          title="A memory operating system shell, not a memory engine yet."
          description="Pandora Memory Engine is being built to manage real-life and AU/story continuity with strict namespace isolation, durable database-backed memory, and auditable changes. The current app is foundation-only."
          actions={
            <>
              <Link className="button-link button-link--primary" href="/dashboard">Open dashboard</Link>
              <Link className="button-link" href="/api/health">Health JSON</Link>
            </>
          }
        />

        <section className="hero-grid">
          <SectionCard title="Current status" description="The shell is intentionally honest about what exists.">
            <div className="status-row"><StatusBadge status="implemented" /><span>Foundation app, documentation, and migration workflow are present.</span></div>
            <div className="status-row"><StatusBadge status="planned" /><span>Memory storage, search, AU continuity, OpenAI calls, GPT Actions, and MCP are not implemented.</span></div>
          </SectionCard>
          <EmptyState
            title="No memory records are displayed."
            description="This landing page does not show fake counts, fake AU worlds, fake people, fake risks, fake promises, or fake audit activity. Future pages must connect to real implemented services before showing live data."
          />
        </section>

        <SectionCard title="Operating principles" description="These rules shape the UI before the backend memory engine exists.">
          <div className="item-grid">
            {safetyRules.map((item) => (
              <article className="status-item" key={item.title}>
                <StatusBadge status={item.status} />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
