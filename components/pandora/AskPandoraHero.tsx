export function AskPandoraHero() {
  return (
    <section className="pd-hero">
      <div><p className="pd-label">Ask Pandora</p><h2>Pandora is stable. The next risk is memory clutter, not stream failure.</h2><p>V0.4 is hardened: payload caps, profile refresh reruns, namespace isolation, and action envelopes are working. The next cleanup target is retrieval evals plus master-pack supersession.</p></div>
      <div className="pd-hero-actions"><button type="button" className="pd-primary-btn">Refresh Context Pack</button><button type="button" className="pd-secondary-btn">Run Retrieval Eval</button></div>
      <div className="pd-evidence">Based on 11 memories • 6 preferences • 2 facts • Confidence 0.88 • request_id enabled</div>
    </section>
  );
}
