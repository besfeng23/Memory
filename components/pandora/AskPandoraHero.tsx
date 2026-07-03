import { profileSnapshot } from "./mock-data";

export function AskPandoraHero() {
  return (
    <section className="pd-hero">
      <div>
        <p className="pd-label">Ask Pandora</p>
        <h2>Pandora dashboard is an authenticated mock shell.</h2>
        <p>This route is for layout review only. It does not present live memory health, retrieval scores, profile state, or queue activity until those claims are backed by implemented routes, database policy, and tests.</p>
      </div>
      <div className="pd-hero-actions">
        <button type="button" className="pd-primary-btn" disabled>Context pack backend pending</button>
        <button type="button" className="pd-secondary-btn" disabled>Retrieval eval backend pending</button>
      </div>
      <div className="pd-evidence">{profileSnapshot.evidence}</div>
    </section>
  );
}
