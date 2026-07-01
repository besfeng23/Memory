import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/security/auth";
import { getProjectContextSnapshot, listOperatingProjects } from "@/lib/operating/projects";
import { createOperatingProjectAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ project?: string }>;

function Field({ label, name, placeholder, required = false, textarea = false }: Readonly<{ label: string; name: string; placeholder?: string; required?: boolean; textarea?: boolean }>) {
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

export default async function OperatingProjectsPage({ searchParams }: Readonly<{ searchParams?: SearchParams }>) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AppShell>
        <div className="page-stack">
          <PageHeader
            eyebrow="Phase 6B"
            title="Project Context Engine"
            description="Sign in to create durable project context."
            actions={<Link className="button-link button-link--primary" href="/auth/login">Login</Link>}
          />
        </div>
      </AppShell>
    );
  }

  const params = searchParams ? await searchParams : undefined;
  const projects = await listOperatingProjects("real_life", 20);
  const selectedKey = params?.project ?? projects[0]?.project_key;
  const snapshot = selectedKey ? await getProjectContextSnapshot(selectedKey, "real_life") : null;

  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="Phase 6B"
          title="Project Context Engine"
          description="Durable project memory for proof targets, tasks, decisions, constraints, artifacts, and open loops."
          actions={<Link className="button-link" href="/operating">Operating cockpit</Link>}
        />

        <section className="hero-grid">
          <SectionCard title="Create project" description="Create one durable project record per project key.">
            <form action={createOperatingProjectAction} className="form-stack">
              <Field label="Project key" name="project_key" placeholder="phase-6b-project-context-engine" required />
              <Field label="Title" name="title" placeholder="Phase 6B Project Context Engine" required />
              <Field label="Purpose" name="purpose" placeholder="What this project should achieve" textarea />
              <Field label="Proof target" name="proof_target" placeholder="What proves progress" textarea />
              <Field label="Current phase" name="current_phase" placeholder="foundation / build / smoke / deploy" />
              <button className="button-link button-link--primary" type="submit">Create project</button>
            </form>
          </SectionCard>

          <SectionCard title="Projects" description="Select a project to view its context snapshot.">
            <div className="record-list">
              {projects.length ? projects.map((project) => (
                <Link className="status-item" href={`/operating/projects?project=${project.project_key}`} key={project.id}>
                  <StatusBadge status={project.project_key === selectedKey ? "implemented" : "foundation"} />
                  <h3>{project.title}</h3>
                  <p>{project.project_key} · priority {project.priority} · {project.status}</p>
                </Link>
              )) : <Empty message="No operating projects yet." />}
            </div>
          </SectionCard>
        </section>

        {snapshot ? (
          <>
            <SectionCard title={snapshot.project.title} description={snapshot.project.purpose ?? "No purpose recorded yet."}>
              <div className="record-stack">
                <div className="status-row"><StatusBadge status="implemented" /><strong>{snapshot.project.project_key}</strong></div>
                <p><strong>Proof target:</strong> {snapshot.project.proof_target ?? "—"}</p>
                <p><strong>Current phase:</strong> {snapshot.project.current_phase ?? "—"}</p>
                <p><strong>Status:</strong> {snapshot.project.status}</p>
              </div>
            </SectionCard>

            <section className="hero-grid">
              <SectionCard title="Tasks" description="Project tasks and proof requirements.">
                <div className="record-list">
                  {snapshot.tasks.length ? snapshot.tasks.map((task) => (
                    <article className="status-item" key={task.id}>
                      <StatusBadge status={task.status === "done" ? "implemented" : "foundation"} />
                      <h3>{task.title}</h3>
                      <p>Status: {task.status} · Proof: {task.proof_required ?? "—"}</p>
                    </article>
                  )) : <Empty message="No project tasks yet." />}
                </div>
              </SectionCard>

              <SectionCard title="Decisions" description="Durable project decisions.">
                <div className="record-list">
                  {snapshot.decisions.length ? snapshot.decisions.map((decision) => (
                    <article className="status-item" key={decision.id}>
                      <StatusBadge status="implemented" />
                      <h3>{decision.decision}</h3>
                      <p>{decision.reason ?? "No reason recorded."}</p>
                    </article>
                  )) : <Empty message="No project decisions yet." />}
                </div>
              </SectionCard>
            </section>

            <section className="hero-grid">
              <SectionCard title="Constraints" description="Project constraints.">
                <div className="record-list">
                  {snapshot.constraints.length ? snapshot.constraints.map((constraint) => (
                    <article className="status-item" key={constraint.id}>
                      <StatusBadge status={constraint.status === "active" ? "foundation" : "implemented"} />
                      <h3>{constraint.constraint_text}</h3>
                      <p>Severity: {constraint.severity}</p>
                    </article>
                  )) : <Empty message="No project constraints yet." />}
                </div>
              </SectionCard>

              <SectionCard title="Artifacts" description="Project proof and artifacts.">
                <div className="record-list">
                  {snapshot.artifacts.length ? snapshot.artifacts.map((artifact) => (
                    <article className="status-item" key={artifact.id}>
                      <StatusBadge status="implemented" />
                      <h3>{artifact.title}</h3>
                      <p>{artifact.artifact_type} · {artifact.proof_value ?? "No proof value recorded."}</p>
                    </article>
                  )) : <Empty message="No project artifacts yet." />}
                </div>
              </SectionCard>
            </section>

            <SectionCard title="Open loops" description="Unresolved project loops.">
              <div className="record-list">
                {snapshot.openLoops.length ? snapshot.openLoops.map((loop) => (
                  <article className="status-item" key={loop.id}>
                    <StatusBadge status={loop.status === "open" ? "foundation" : "implemented"} />
                    <h3>{loop.loop_text}</h3>
                    <p>Next action: {loop.next_action ?? "—"}</p>
                  </article>
                )) : <Empty message="No open loops yet." />}
              </div>
            </SectionCard>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
