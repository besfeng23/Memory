import { AppShell } from "@/components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <section className="card">
        <h2>Foundation shell</h2>
        <p>
          Pandora is currently in foundation mode. This app establishes the Next.js, TypeScript,
          Supabase, validation, and layout boundaries required before memory storage, retrieval,
          OpenAI integration, or AU canon logic are implemented.
        </p>
      </section>
    </AppShell>
  );
}
