import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/security/auth";
import { getOperatingSnapshot } from "@/lib/operating/service";
import { completeOperatingSmokeAction, seedOperatingSmokeAction } from "./actions";

export const dynamic = "force-dynamic";

function SmokeRow({ label, passed, detail }: Readonly<{ label: string; passed: boolean; detail: string }>) {
  return (
    <div className="status-row">
      <StatusBadge status={passed ? "implemented" : "planned"} />
      <span><strong>{label}</strong> — {detail}</span>
    </div>
  );
}

export default async function OperatingSmokePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AppShell>
        <div className="page-stack">
          <PageHeader
            eyebrow="Phase 6A.2 smoke"
            title="Signed-in Operating Smoke"
            description="Sign in first. The smoke workflow only writes records for the authenticated user."
            actions={<Link className="button-link button-link--primary" href="/auth/login">Login</Link>}
          />
        </div>
      </AppShell>
    );
  }

  const snapshot = await getOperatingSnapshot("real_life");
  const hasPriorityLock = Boolean(snapshot.activePriorityLock?.project_key === "phase-6a-operating-smoke");
  const hasSession = Boolean(snapshot.activeWorkSession?.project_key === "phase-6a-operating-smoke");
  const hasObna = Boolean(snapshot.activeObna);
  const hasRawMovement = snapshot.rawMovementItems.some((item) => item.source === "phase-6a2-smoke");
  const hasDecisionGate = snapshot.decisionGates.some((gate) => gate.action_considered.includes("Phase 6A.2"));

  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="Phase 6A.2 smoke"
          title="Signed-in Operating Smoke"
          description="Use this page to prove the operating cockpit can create and persist the Phase 6A primitives for the current signed-in user."
          actions={
            <>
              <Link className="button-link" href="/operating">Back to operating</Link>
              <Link className="button-link" href="/api/operating/work-sessions/current">Current session API</Link>
            </>
          }
        />

        <SectionCard title="Smoke controls" description="This creates only user-owned real_life records through the same service layer used by /operating.">
          <div className="topbar__actions">
            <form action={seedOperatingSmokeAction}>
              <button className="button-link button-link--primary" type="submit">Seed smoke workflow</button>
            </form>
            <form action={completeOperatingSmokeAction}>
              <button className="button-link" type="submit">Complete smoke workflow</button>
            </form>
          </div>
        </SectionCard>

        <SectionCard title="Smoke checklist" description="Reload after each action and verify these rows stay green.">
          <SmokeRow label="Priority lock" passed={hasPriorityLock} detail={snapshot.activePriorityLock?.locked_outcome ?? "No smoke priority lock yet."} />
          <SmokeRow label="Work session" passed={hasSession} detail={snapshot.activeWorkSession?.declared_goal ?? "No active smoke work session yet."} />
          <SmokeRow label="OBNA" passed={hasObna} detail={snapshot.activeObna?.title ?? "No active OBNA yet."} />
          <SmokeRow label="Raw movement" passed={hasRawMovement} detail={hasRawMovement ? "Smoke raw movement item exists." : "No smoke raw movement item found."} />
          <SmokeRow label="Decision gate" passed={hasDecisionGate} detail={hasDecisionGate ? "Smoke decision gate exists." : "No smoke decision gate found."} />
        </SectionCard>

        <SectionCard title="Manual acceptance" description="Phase 6A.2 is accepted only after a real signed-in session does this successfully.">
          <ol>
            <li>Open this page while signed in.</li>
            <li>Click Seed smoke workflow.</li>
            <li>Confirm all smoke checklist rows become green after reload.</li>
            <li>Open /operating and confirm the same records appear there.</li>
            <li>Return here and click Complete smoke workflow.</li>
            <li>Confirm the active session is ended and OBNA is no longer active.</li>
          </ol>
        </SectionCard>
      </div>
    </AppShell>
  );
}
