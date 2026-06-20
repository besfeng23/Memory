import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

const sections = ["Pending", "Needs clarification", "Blocked", "Approved", "Rejected", "Archived"];

type ReviewQueueItemDto = { id: string; status: string; namespace: "real_life" | "au"; candidatePreview: string; evidenceSummary: string; sensitivityLevel: string; productionWriteDisabled: true; approvalActionsDisabled: true };

async function fetchReadOnlyReviewQueuePlaceholder(): Promise<{ disabled: true; items: ReviewQueueItemDto[] }> {
  return { disabled: true, items: [] };
}
const safeFields = ["Namespace: real_life or au", "Candidate preview: redacted UI-safe text", "Evidence summary: snapshot only", "Sensitivity: low/medium/high/restricted", "Status: review-only"];

export default function MemoryReviewPage() {
  void fetchReadOnlyReviewQueuePlaceholder;
  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader eyebrow="Review only" title="Review Queue" description="Production write disabled. This page is a safe shell for future authenticated review workflows and does not approve, persist, or fetch production memory." />
        <SectionCard title="Backend state" description="API routes use an authenticated read-only factory in tests and remain safely disabled when production auth wiring is unavailable.">
          <div className="status-row"><StatusBadge status="stubbed" /><span>Production write disabled</span></div>
          <div className="status-row"><StatusBadge status="foundation" /><span>Read-only review queue — Approval actions disabled; no live approve/reject buttons are exposed.</span></div>
        </SectionCard>
        <section className="hero-grid">
          {sections.map((section) => (
            <SectionCard key={section} title={section} description="No production data is loaded in this foundation shell.">
              <EmptyState title={`No ${section.toLowerCase()} items shown.`} description="Future read-only authenticated APIs may populate this area with UI-safe DTOs only." />
            </SectionCard>
          ))}
        </section>
        <SectionCard title="Example UI-safe fields" description="Shape preview only; not real user data.">
          <ul>{safeFields.map((field) => <li key={field}>{field}</li>)}</ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
