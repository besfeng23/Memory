import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/security/auth";
import { getOperatingSnapshot } from "@/lib/operating/service";
import { generateObnaAction, startWorkSessionAction } from "./actions";

export const dynamic = "force-dynamic";

function Field({
  label,
  name,
  placeholder,
  textarea = false,
  required = false,
}: Readonly<{ label: string; name: string; placeholder?: string; textarea?: boolean; required?: boolean }>) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {textarea ? <textarea name={name} placeholder={placeholder} required={required} rows={4} /> : <input name={name} placeholder={placeholder} required={required} />}
    </label>
  );
}

function Empty({ message }: Readonly<{ message: string }>) {
  return <p className="empty-inline">{message}</p>;
}

function formatList(items: string[] | null) {
  return items?.length ? items.join(", ") : "—";
}

export default async function OperatingPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AppShell>
        <div className="page-stack">
          <PageHeader
            eyebrow="Phase 6A"
            title="Pandora Operating Brain"
            description="Sign in to use the operating cockpit. Phase 6A is a foundation, not the full autonomous brain."
            actions={<Link className="button-link button-link--primary" href="/auth/login">Login</Link>}
          />
        </div>
      </AppShell>
    );
  }

  const snapshot = await getOperatingSnapshot("real_life");

  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="Phase 6A operating cockpit"
          title="Pandora Operating Brain"
          description="Reality, proof, and execution. This route anchors work sessions, priority locks, raw movement, decision gates, and rule-based OBNA."
          actions={
            <>
              <Link className="button-link" href="/dashboard">Foundation dashboard</Link>
              <Link className="button-link" href="/api/operating/work-sessions/current">Current session API</Link>
            </>
          }
        />

        <SectionCard title="Anti-drift rule" description="This route is intentionally scoped.">
          <div className="status-row">
            <StatusBadge status="foundation" />
            <span>No connector expansion, prediction engine, or autonomous actions until Phase 6A has schema, APIs, dashboard proof, and docs.</span>
          </div>
        </SectionCard>

        <section className="hero-grid">
          <SectionCard title="Today's Priority Lock" description="Create or update through /api/operating/priority-lock.">
            {snapshot.activePriorityLock ? (
              <div className="record-stack">
                <div className="status-row"><StatusBadge status="implemented" /><strong>{snapshot.activePriorityLock.project_key}</strong></div>
                <p><strong>Outcome:</strong> {snapshot.activePriorityLock.locked_outcome}</p>
                <p><strong>Proof target:</strong> {snapshot.activePriorityLock.proof_target ?? "—"}</p>
                <p><strong>Allowed support:</strong> {formatList(snapshot.activePriorityLock.allowed_support)}</p>
                <p><strong>Blocked distractions:</strong> {formatList(snapshot.activePriorityLock.blocked_distractions)}</p>
              </div>
            ) : <Empty message="No active priority lock yet." />}
          </SectionCard>

          <SectionCard title="Active Work Session" description="Pandora cannot detect drift without this anchor.">
            {snapshot.activeWorkSession ? (
              <div className="record-stack">
                <div className="status-row"><StatusBadge status="implemented" /><strong>{snapshot.activeWorkSession.declared_goal}</strong></div>
                <p><strong>Project:</strong> {snapshot.activeWorkSession.project_key ?? "—"}</p>
                <p><strong>Proof target:</strong> {snapshot.activeWorkSession.proof_target ?? "—"}</p>
                <p><strong>Next action:</strong> {snapshot.activeWorkSession.next_action ?? "—"}</p>
              </div>
            ) : <Empty message="No active work session. Start one below." />}
          </SectionCard>
        </section>

        <SectionCard title="One Best Next Action" description="One action, not a menu. Rule-based in Phase 6A.">
          {snapshot.activeObna ? (
            <div className="record-stack">
              <div className="status-row"><StatusBadge status="implemented" /><strong>{snapshot.activeObna.title}</strong></div>
              <p><strong>Reason:</strong> {snapshot.activeObna.reason ?? "—"}</p>
              <p><strong>Proof target:</strong> {snapshot.activeObna.proof_target ?? "—"}</p>
              <p><strong>Timebox:</strong> {snapshot.activeObna.timebox_minutes ?? 25} minutes</p>
              <ol>{(snapshot.activeObna.steps ?? []).map((step) => <li key={step}>{step}</li>)}</ol>
            </div>
          ) : <Empty message="No active OBNA. Generate one from the current operating state." />}
          <form action={generateObnaAction}>
            <button className="button-link button-link--primary" type="submit">Generate OBNA</button>
          </form>
        </SectionCard>

        <section className="hero-grid">
          <SectionCard title="Start Work Session" description="Declare the goal and proof target before doing more work.">
            <form action={startWorkSessionAction} className="form-stack">
              <Field label="Project key" name="project_key" placeholder="phase-6a-operating-brain" />
              <Field label="Declared goal" name="declared_goal" placeholder="Create Phase 6A migration and route contracts" required textarea />
              <Field label="Proof target" name="proof_target" placeholder="Migration applies and /operating reads real data" textarea />
              <Field label="Next action" name="next_action" placeholder="Create the migration file" />
              <button className="button-link button-link--primary" type="submit">Start session</button>
            </form>
          </SectionCard>

          <SectionCard title="Raw Movement Inbox" description="Latest records from /api/operating/raw-movement.">
            <div className="record-list">
              {snapshot.rawMovementItems.length ? snapshot.rawMovementItems.map((item) => (
                <article className="status-item" key={item.id}>
                  <StatusBadge status={item.status === "new" ? "foundation" : "implemented"} />
                  <h3>{item.raw_text}</h3>
                  <p>Status: {item.status} · Risk: {item.risk_level}</p>
                </article>
              )) : <Empty message="No raw movement items yet." />}
            </div>
          </SectionCard>
        </section>

        <SectionCard title="Decision Gates" description="No new project activation without facts, risks, authority check, and proof target.">
          <div className="record-list">
            {snapshot.decisionGates.length ? snapshot.decisionGates.map((gate) => (
              <article className="status-item" key={gate.id}>
                <StatusBadge status={gate.status === "draft" ? "foundation" : "implemented"} />
                <h3>{gate.action_considered}</h3>
                <p>Recommendation: {gate.recommendation ?? gate.status}</p>
                <p>Proof: {gate.proof_required ?? "—"}</p>
              </article>
            )) : <Empty message="No decision gates yet." />}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
