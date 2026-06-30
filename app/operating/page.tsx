import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/security/auth";
import { getOperatingSnapshot } from "@/lib/operating/service";
import {
  completeObnaAction,
  createDecisionGateAction,
  createPriorityLockAction,
  createRawMovementItemAction,
  endWorkSessionAction,
  generateObnaAction,
  startWorkSessionAction,
} from "./actions";

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
          eyebrow="Phase 6A.1 hardening"
          title="Pandora Operating Brain"
          description="Reality, proof, and execution. This cockpit now supports priority locks, work sessions, raw movement capture, decision gates, and rule-based OBNA from one page."
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
            <span>No connector expansion, prediction engine, or autonomous actions until Phase 6A is hardened and manually verified.</span>
          </div>
        </SectionCard>

        <section className="hero-grid">
          <SectionCard title="Today's Priority Lock" description="Creating a new active lock supersedes older active locks.">
            {snapshot.activePriorityLock ? (
              <div className="record-stack">
                <div className="status-row"><StatusBadge status="implemented" /><strong>{snapshot.activePriorityLock.project_key}</strong></div>
                <p><strong>Outcome:</strong> {snapshot.activePriorityLock.locked_outcome}</p>
                <p><strong>Proof target:</strong> {snapshot.activePriorityLock.proof_target ?? "—"}</p>
                <p><strong>Allowed support:</strong> {formatList(snapshot.activePriorityLock.allowed_support)}</p>
                <p><strong>Blocked distractions:</strong> {formatList(snapshot.activePriorityLock.blocked_distractions)}</p>
              </div>
            ) : <Empty message="No active priority lock yet." />}

            <form action={createPriorityLockAction} className="form-stack">
              <Field label="Project key" name="project_key" placeholder="phase-6a-operating-brain" required />
              <Field label="Locked outcome" name="locked_outcome" placeholder="Make the operating cockpit usable from one page" required textarea />
              <Field label="Proof target" name="proof_target" placeholder="User can create priority, session, raw note, decision gate, and OBNA" textarea />
              <Field label="Allowed support" name="allowed_support" placeholder="tests, docs, UI hardening" textarea />
              <Field label="Blocked distractions" name="blocked_distractions" placeholder="connectors, prediction engine, Gmail, Calendar" textarea />
              <button className="button-link button-link--primary" type="submit">Set priority lock</button>
            </form>
          </SectionCard>

          <SectionCard title="Active Work Session" description="Creating a new session supersedes older active sessions.">
            {snapshot.activeWorkSession ? (
              <div className="record-stack">
                <div className="status-row"><StatusBadge status="implemented" /><strong>{snapshot.activeWorkSession.declared_goal}</strong></div>
                <p><strong>Project:</strong> {snapshot.activeWorkSession.project_key ?? "—"}</p>
                <p><strong>Proof target:</strong> {snapshot.activeWorkSession.proof_target ?? "—"}</p>
                <p><strong>Next action:</strong> {snapshot.activeWorkSession.next_action ?? "—"}</p>
                <form action={endWorkSessionAction} className="form-stack">
                  <input name="id" type="hidden" value={snapshot.activeWorkSession.id} />
                  <Field label="Outcome summary" name="outcome_summary" placeholder="What changed? What proof exists?" textarea />
                  <Field label="Next action" name="next_action" placeholder="What should happen next?" />
                  <button className="button-link" type="submit">End session</button>
                </form>
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
              <form action={completeObnaAction}>
                <input name="id" type="hidden" value={snapshot.activeObna.id} />
                <button className="button-link" type="submit">Mark OBNA complete</button>
              </form>
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
              <Field label="Declared goal" name="declared_goal" placeholder="Create Phase 6A.1 hardening proof" required textarea />
              <Field label="Proof target" name="proof_target" placeholder="CI passes and /operating has all Phase 6A forms" textarea />
              <Field label="Next action" name="next_action" placeholder="Run verification and open PR" />
              <button className="button-link button-link--primary" type="submit">Start session</button>
            </form>
          </SectionCard>

          <SectionCard title="Raw Movement Inbox" description="Capture messy ideas before they become drift.">
            <form action={createRawMovementItemAction} className="form-stack">
              <Field label="Raw movement" name="raw_text" placeholder="Paste the messy idea, risk, lead, proof gap, or next thought here" required textarea />
              <button className="button-link button-link--primary" type="submit">Capture raw movement</button>
            </form>
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
          <form action={createDecisionGateAction} className="form-stack">
            <Field label="Action considered" name="action_considered" placeholder="Should we activate connector work now?" required textarea />
            <Field label="Desired outcome" name="desired_outcome" placeholder="What would this produce?" textarea />
            <Field label="Facts" name="facts" placeholder="One fact per line" textarea />
            <Field label="Assumptions" name="assumptions" placeholder="One assumption per line" textarea />
            <Field label="Risks" name="risks" placeholder="One risk per line" textarea />
            <Field label="Authority check" name="authority_check" placeholder="Who can approve this?" textarea />
            <Field label="Proof required" name="proof_required" placeholder="What evidence proves progress?" textarea />
            <Field label="Recommendation" name="recommendation" placeholder="go, park, kill, or rework" />
            <Field label="Next action" name="next_action" placeholder="What happens next?" />
            <button className="button-link button-link--primary" type="submit">Create decision gate</button>
          </form>

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
