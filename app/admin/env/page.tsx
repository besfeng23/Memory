import { getEnvBrokerStatus, PHASE5A_QUEUE_SAFE, PHASE5C_SAFE_PRODUCTION } from "@/lib/services/env-broker-service";
import { buildEnvDriftReport } from "@/lib/services/env-drift-service";

export default async function AdminEnvPage() {
  const status = getEnvBrokerStatus();
  const drift = await buildEnvDriftReport();
  const driftColor = drift.severity === "green" ? "#0a7f27" : drift.severity === "yellow" ? "#9a6700" : "#b42318";
  return <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
    <h1>Pandora Env Broker</h1>
    <p>Internal environment-variable control plane. Raw secret values are never rendered; only status and redacted fingerprints appear.</p>

    <section><h2>Overview</h2><ul>
      <li>Total env keys discovered: {status.totals.discovered}</li>
      <li>Managed keys: {status.totals.managed}</li>
      <li>Missing required keys: {status.totals.requiredMissing}</li>
      <li>Unsafe keys: {status.totals.unsafe}</li>
      <li>Unknown keys: {status.totals.unknown}</li>
      <li>Broker enabled: {String(status.brokerEnabled)}</li>
    </ul></section>

    <section style={{ border: `2px solid ${driftColor}`, padding: 12 }}>
      <h2>Drift guard: <span style={{ color: driftColor }}>{drift.severity.toUpperCase()}</span></h2>
      <p>GREEN means catalog and provider are aligned. YELLOW means unknown or unmanaged provider envs need review. RED means required envs are missing or unsafe public-secret names exist.</p>
      <ul>
        <li>Missing in provider: {drift.missingInProvider.join(", ") || "none"}</li>
        <li>Unmanaged provider envs: {drift.unmanagedProviderEnvs.join(", ") || "none"}</li>
        <li>Known but unclassified: {drift.knownButUnclassified.join(", ") || "none"}</li>
        <li>Unsafe public-secret naming: {drift.unsafePublicSecretNaming.join(", ") || "none"}</li>
        <li>Stale fingerprints: {drift.staleFingerprints.join(", ") || "none"}</li>
        <li>Needs redeploy: {drift.needsRedeploy.join(", ") || "none"}</li>
      </ul>
      {(!drift.brokerEnabled || !drift.providerTokenConfigured || drift.missingInProvider.length > 0 || drift.needsRedeploy.length > 0 || drift.providerError) && <p role="alert"><strong>Runtime warning:</strong> {!drift.brokerEnabled ? " PANDORA_ENV_BROKER_ENABLED is false." : ""}{!drift.providerTokenConfigured ? " PANDORA_VERCEL_API_TOKEN is missing." : ""}{drift.missingInProvider.length ? " Required envs are missing." : ""}{drift.providerError ? ` Provider drift check blocked: ${drift.providerError}.` : ""}{drift.needsRedeploy.length ? " Deployment required after env push." : ""}</p>}
      <form method="post" action="/api/admin/env/drift/check"><button type="submit">Check drift</button></form>
      <form method="post" action="/api/admin/env/drift/resolve"><input type="hidden" name="action" value="push-safe-defaults" /><label>Confirmation <input name="confirmation" placeholder="RESOLVE ENV DRIFT" /></label><button type="submit">Push required safe defaults</button></form>
      <form method="post" action="/api/admin/env/drift/resolve"><input type="hidden" name="action" value="generate-missing-secrets" /><label>Confirmation <input name="confirmation" placeholder="RESOLVE ENV DRIFT" /></label><button type="submit">Generate/rotate missing generated secrets</button></form>
    </section>

    <section><h2>Projects</h2><table><tbody><tr><th>Project</th><th>Provider</th><th>Provider project ID</th><th>Production URL</th><th>Provider token status</th></tr><tr><td>{status.project.displayName}</td><td>{status.project.provider}</td><td>{status.project.providerProjectId}</td><td>{status.project.productionUrl}</td><td>{process.env.PANDORA_VERCEL_API_TOKEN ? "available" : "blocked_missing_provider_token"}</td></tr></tbody></table></section>

    <section><h2>Actions</h2><div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
      <form method="post" action="/api/admin/env/providers/vercel/push" style={{ border: "1px solid #ddd", padding: 12 }}>
        <h3>Generate and push internal job token</h3>
        <input type="hidden" name="key" value="PANDORA_INTERNAL_JOB_TOKEN" />
        <p>Creates a fresh value server-side, pushes it to Vercel production, stores only fingerprint metadata, and returns no raw value.</p>
        <button type="submit">Generate + push to Vercel</button>
      </form>

      <form method="post" action="/api/admin/env/keys/rotate" style={{ border: "1px solid #ddd", padding: 12 }}>
        <h3>Rotate internal job token</h3>
        <input type="hidden" name="key" value="PANDORA_INTERNAL_JOB_TOKEN" />
        <label>Confirmation <input name="confirmation" placeholder="ROTATE PANDORA_INTERNAL_JOB_TOKEN" style={{ minWidth: 360 }} /></label>
        <p>Rotation also pushes the new value to Vercel production and requires redeploy before authenticated smoke tests can use it.</p>
        <button type="submit">Rotate + push</button>
      </form>

      <form method="post" action="/api/admin/env/providers/vercel/push-safe-defaults" style={{ border: "1px solid #ddd", padding: 12 }}>
        <h3>Push Phase 5C safe defaults</h3>
        <label>Confirmation <input name="confirmation" placeholder="PUSH SAFE DEFAULTS" style={{ minWidth: 260 }} /></label>
        <p>Pushes production-safe Phase 5C runtime flags only. It does not enable model calls, embeddings, semantic retrieval, public reads/writes, or auto-capture.</p>
        <button type="submit">Push safe defaults</button>
      </form>

      <form method="post" action="/api/admin/env/smoke/phase5c" style={{ border: "1px solid #ddd", padding: 12 }}>
        <h3>Run Phase 5C smoke test</h3>
        <input type="hidden" name="baseUrl" value="https://pandorasmemory.vercel.app" />
        <p>Runs server-side health, compaction page, missing/wrong token, and authenticated dry-run checks if the current deployment has a server-side job token configured.</p>
        <button type="submit">Run smoke test</button>
      </form>
    </div></section>

    <section><h2>Env catalog</h2><table><thead><tr><th>Key</th><th>Classification</th><th>Required</th><th>Target</th><th>Provider status</th><th>Fingerprint</th><th>Safe default</th><th>Source files</th></tr></thead><tbody>{status.catalog.map((item) => <tr key={item.key}><td><code>{item.key}</code></td><td>{item.classificationSuggestion}</td><td>{String(item.requiredSuggestion)}</td><td>{item.providerTargetSuggestion}</td><td>{item.present ? "present" : "missing_or_unknown"}</td><td>{item.fingerprint ?? "—"}</td><td>{item.safeDefault ?? "—"}</td><td>{item.sources.slice(0, 3).map((s) => `${s.file}:${s.line}`).join(", ")}</td></tr>)}</tbody></table></section>

    <section><h2>Presets</h2><h3>phase5c_safe_production</h3><pre>{JSON.stringify(PHASE5C_SAFE_PRODUCTION, null, 2)}</pre><h3>phase5a_queue_safe</h3><pre>{JSON.stringify(PHASE5A_QUEUE_SAFE, null, 2)}</pre></section>
  </main>;
}
