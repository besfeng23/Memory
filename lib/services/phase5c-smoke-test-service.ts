export async function runPhase5cSmokeTest(baseUrl: string, managedToken?: string) {
  const steps: { name: string; ok: boolean; status?: number; code?: string; dryRun?: boolean }[] = [];
  async function get(path: string) { const res = await fetch(`${baseUrl}${path}`); steps.push({ name: `GET ${path}`, ok: res.ok, status: res.status }); }
  await get("/api/health"); await get("/admin/memory/compaction");
  for (const token of [undefined, "wrong-token"]) { const res = await fetch(`${baseUrl}/api/memory/jobs/daily-digest`, { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify({ namespace: "real_life", dry_run: true }) }); steps.push({ name: token ? "wrong_token" : "missing_token", ok: res.status === 401, status: res.status }); }
  if (!managedToken) { steps.push({ name: "managed_token_real_life", ok: false, code: "raw_token_not_retained" }); steps.push({ name: "managed_token_au", ok: false, code: "raw_token_not_retained" }); return { ok: false, steps }; }
  for (const namespace of ["real_life", "au"]) { const res = await fetch(`${baseUrl}/api/memory/jobs/daily-digest`, { method: "POST", headers: { authorization: `Bearer ${managedToken}`, "content-type": "application/json" }, body: JSON.stringify({ namespace, dry_run: true }) }); let json: { dry_run?: boolean } = {}; try { json = await res.json(); } catch {} steps.push({ name: `managed_token_${namespace}`, ok: res.status === 200 && json.dry_run === true, status: res.status, dryRun: json.dry_run === true }); }
  return { ok: steps.every((s) => s.ok), steps };
}
