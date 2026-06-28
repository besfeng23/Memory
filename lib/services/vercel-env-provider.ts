import { redactErrorMessage } from "@/lib/services/env-validation-service";
export type VercelEnvPushInput = { projectId: string; teamId: string; key: string; value: string; target?: ("production" | "preview" | "development")[]; type?: "encrypted" | "plain" };
export type VercelEnvPushResult = { ok: true; providerEnvId?: string; redeployRequired: true } | { ok: false; code: string; errorMessageRedacted: string };
export async function pushVercelEnv(input: VercelEnvPushInput, token = process.env.PANDORA_VERCEL_API_TOKEN): Promise<VercelEnvPushResult> {
  if (!token) return { ok: false, code: "blocked_missing_provider_token", errorMessageRedacted: "Vercel bootstrap token is not configured." };
  const res = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(input.projectId)}/env?upsert=true&teamId=${encodeURIComponent(input.teamId)}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ key: input.key, value: input.value, target: input.target ?? ["production", "preview", "development"], type: input.type ?? "encrypted" }) });
  if (!res.ok) return { ok: false, code: "provider_error", errorMessageRedacted: redactErrorMessage(await res.text()) };
  const body = await res.json().catch(() => ({}));
  return { ok: true, providerEnvId: body.id, redeployRequired: true };
}
export async function listVercelEnvStatus(projectId: string, teamId: string, token = process.env.PANDORA_VERCEL_API_TOKEN) { if (!token) return { ok: false as const, code: "blocked_missing_provider_token" }; const res = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env?teamId=${encodeURIComponent(teamId)}`, { headers: { Authorization: `Bearer ${token}` } }); if (!res.ok) return { ok: false as const, code: "provider_error" }; return { ok: true as const, envs: await res.json() }; }
