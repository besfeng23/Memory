import { getEnvBrokerStatus, PHASE5A_QUEUE_SAFE, PHASE5C_SAFE_PRODUCTION } from "@/lib/services/env-broker-service";

export default function AdminEnvPage() {
  const status = getEnvBrokerStatus();
  return <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
    <h1>Pandora Env Broker</h1>
    <p>Internal environment-variable control plane. Raw secret values are never rendered; only status and redacted fingerprints appear.</p>
    <section><h2>Overview</h2><ul>
      <li>Total env keys discovered: {status.totals.discovered}</li><li>Managed keys: {status.totals.managed}</li><li>Missing required keys: {status.totals.requiredMissing}</li><li>Unsafe keys: {status.totals.unsafe}</li><li>Unknown keys: {status.totals.unknown}</li><li>Broker enabled: {String(status.brokerEnabled)}</li>
    </ul></section>
    <section><h2>Projects</h2><table><tbody><tr><th>Project</th><th>Provider</th><th>Provider project ID</th><th>Production URL</th><th>Last sync status</th></tr><tr><td>{status.project.displayName}</td><td>{status.project.provider}</td><td>{status.project.providerProjectId}</td><td>{status.project.productionUrl}</td><td>{process.env.PANDORA_VERCEL_API_TOKEN ? "available" : "blocked_missing_provider_token"}</td></tr></tbody></table></section>
    <section><h2>Env catalog</h2><table><thead><tr><th>Key</th><th>Classification</th><th>Required</th><th>Target</th><th>Provider status</th><th>Fingerprint</th><th>Safe default</th><th>Source files</th></tr></thead><tbody>{status.catalog.map((item) => <tr key={item.key}><td><code>{item.key}</code></td><td>{item.classificationSuggestion}</td><td>{String(item.requiredSuggestion)}</td><td>{item.providerTargetSuggestion}</td><td>{item.present ? "present" : "missing_or_unknown"}</td><td>{item.fingerprint ?? "—"}</td><td>{item.safeDefault ?? "—"}</td><td>{item.sources.slice(0, 3).map((s) => `${s.file}:${s.line}`).join(", ")}</td></tr>)}</tbody></table></section>
    <section><h2>Actions</h2><ul><li>Discover envs: POST /api/admin/env/discover</li><li>Sync catalog: POST /api/admin/env/catalog/sync</li><li>Generate missing generated secrets: POST /api/admin/env/keys/generate</li><li>Rotate selected secret with confirmation: ROTATE &lt;KEY&gt;</li><li>Push safe defaults with confirmation: PUSH SAFE DEFAULTS</li><li>Push selected key: POST /api/admin/env/providers/vercel/push</li><li>Run Phase 5C smoke test: POST /api/admin/env/smoke/phase5c</li></ul></section>
    <section><h2>Presets</h2><h3>phase5c_safe_production</h3><pre>{JSON.stringify(PHASE5C_SAFE_PRODUCTION, null, 2)}</pre><h3>phase5a_queue_safe</h3><pre>{JSON.stringify(PHASE5A_QUEUE_SAFE, null, 2)}</pre></section>
  </main>;
}
