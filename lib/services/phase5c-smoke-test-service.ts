export type Phase5cSmokeStep = { name: string; ok: boolean; status?: number; code?: string; dryRun?: boolean };
export type Phase5cSmokeResult = { ok: boolean; authenticatedDryRunVerified: boolean; steps: Phase5cSmokeStep[]; blockers: string[]; warnings: string[] };

export async function runPhase5cSmokeTest(baseUrl: string, managedToken?: string): Promise<Phase5cSmokeResult> {
  const steps: Phase5cSmokeStep[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  const root = baseUrl.replace(/\/$/, "");

  async function get(path: string) {
    const res = await fetch(`${root}${path}`);
    steps.push({ name: `GET ${path}`, ok: res.ok, status: res.status });
  }

  await get("/api/health");
  await get("/admin/memory/compaction");

  for (const token of [undefined, "wrong-token"]) {
    const res = await fetch(`${root}/api/memory/jobs/daily-digest`, {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}`, "content-type": "application/json" } : { "content-type": "application/json" },
      body: JSON.stringify({ namespace: "real_life", dry_run: true }),
    });
    steps.push({ name: token ? "wrong_token" : "missing_token", ok: res.status === 401, status: res.status });
  }

  if (!managedToken) {
    blockers.push("raw_token_not_retained_or_not_configured");
    steps.push({ name: "managed_token_real_life", ok: false, code: "raw_token_not_retained_or_not_configured" });
    steps.push({ name: "managed_token_au", ok: false, code: "raw_token_not_retained_or_not_configured" });
    return { ok: false, authenticatedDryRunVerified: false, steps, blockers, warnings };
  }

  for (const namespace of ["real_life", "au"] as const) {
    const res = await fetch(`${root}/api/memory/jobs/daily-digest`, {
      method: "POST",
      headers: { authorization: `Bearer ${managedToken}`, "content-type": "application/json" },
      body: JSON.stringify({ namespace, dry_run: true }),
    });
    let json: { dry_run?: boolean; dryRun?: boolean; ok?: boolean } = {};
    try {
      json = await res.json();
    } catch {}
    const dryRun = json.dry_run === true || json.dryRun === true;
    steps.push({ name: `managed_token_${namespace}`, ok: res.status === 200 && dryRun, status: res.status, dryRun });
  }

  const authenticatedDryRunVerified = steps.filter((s) => s.name.startsWith("managed_token_")).every((s) => s.ok && s.dryRun === true);
  if (!authenticatedDryRunVerified) warnings.push("authenticated_dry_run_not_verified");
  return { ok: steps.every((s) => s.ok), authenticatedDryRunVerified, steps, blockers, warnings };
}
