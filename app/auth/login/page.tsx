import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function LoginPage({ searchParams }: Readonly<{ searchParams?: Promise<{ error?: string }> }>) {
  const params = await searchParams;

  return (
    <main className="auth-page">
      <SectionCard
        title="Supabase Auth foundation"
        description="Request a magic link to create or refresh a Supabase Auth session. Memory features, profile tables, and production user data are not implemented yet."
      >
        <div className="auth-status-line">
          <StatusBadge status="foundation" />
          <span>Auth/session boundary implemented without memory data.</span>
        </div>
        {params?.error ? <p className="auth-form__message auth-form__message--error">Authentication callback failed. Please request a new magic link.</p> : null}
        <LoginForm />
        <p className="auth-note">This page uses only the public Supabase URL and anon key. Server secrets are not exposed to the browser.</p>
        <div className="topbar__actions">
          <Link className="button-link" href="/dashboard">View dashboard</Link>
          <Link className="button-link" href="/api/session">View session JSON</Link>
        </div>
      </SectionCard>
    </main>
  );
}
