export function AskPandoraHero({ hero, evidence, warnings }: { hero: { title: string; description: string; primaryAction: string; secondaryAction: string }; evidence: string; warnings: string[] }) {
  return (
    <section className="pd-hero">
      <div>
        <p className="pd-label">Ask Pandora</p>
        <h2>{hero.title}</h2>
        <p>{hero.description}</p>
      </div>
      <div className="pd-hero-actions">
        <button type="button" className="pd-primary-btn" disabled>{hero.primaryAction}</button>
        <button type="button" className="pd-secondary-btn" disabled>{hero.secondaryAction}</button>
      </div>
      <div className="pd-evidence">{evidence}</div>
      {warnings.length ? <div className="pd-envelope"><strong>Loader warnings</strong><p>{warnings.join(" ")}</p></div> : null}
    </section>
  );
}
