import { AppShell } from "@/components/layout/app-shell";

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="card">
        <h2>Dashboard placeholder</h2>
        <p>
          This page is intentionally limited to project status. No memory database schema,
          namespace retrieval, OpenAI calls, AU canon guard, or simulated memory features have
          been implemented yet.
        </p>
      </section>
    </AppShell>
  );
}
