import { redactErrorMessage } from "@/lib/services/env-validation-service";

export type VercelEnvTarget = "production" | "preview" | "development";
export type VercelEnvPushInput = {
  projectId: string;
  teamId: string;
  key: string;
  value: string;
  target?: VercelEnvTarget[];
  type?: "encrypted" | "plain";
  comment?: string;
};
export type VercelEnvPushResult =
  | { ok: true; providerEnvId?: string; redeployRequired: true; target: VercelEnvTarget[] }
  | { ok: false; code: string; errorMessageRedacted: string; target?: VercelEnvTarget[] };

export async function pushVercelEnv(input: VercelEnvPushInput, token = process.env.PANDORA_VERCEL_API_TOKEN): Promise<VercelEnvPushResult> {
  const target = input.target ?? ["production"];
  if (!token) return { ok: false, code: "blocked_missing_provider_token", errorMessageRedacted: "Vercel bootstrap token is not configured.", target };

  const res = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(input.projectId)}/env?upsert=true&teamId=${encodeURIComponent(input.teamId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      key: input.key,
      value: input.value,
      target,
      type: input.type ?? "plain",
      comment: input.comment ?? "Managed by Pandora Env Broker",
    }),
  });

  if (!res.ok) return { ok: false, code: "provider_error", errorMessageRedacted: redactErrorMessage(await res.text()), target };
  const body = await res.json().catch(() => ({}));
  return { ok: true, providerEnvId: typeof body.id === "string" ? body.id : undefined, redeployRequired: true, target };
}

export type VercelEnvStatusItem = { key: string; target?: string[]; id?: string; createdAt?: number; updatedAt?: number; type?: string };

export async function listVercelEnvStatus(projectId: string, teamId: string, token = process.env.PANDORA_VERCEL_API_TOKEN) {
  if (!token) return { ok: false as const, code: "blocked_missing_provider_token" };
  const res = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env?teamId=${encodeURIComponent(teamId)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return { ok: false as const, code: "provider_error" };
  const body = await res.json().catch(() => ({}));
  const rawEnvs = Array.isArray(body?.envs) ? body.envs : [];
  const envs: VercelEnvStatusItem[] = rawEnvs.map((item: { key?: unknown; target?: unknown; id?: unknown; createdAt?: unknown; updatedAt?: unknown; type?: unknown }) => ({
    key: typeof item.key === "string" ? item.key : "",
    target: Array.isArray(item.target) ? item.target.filter((target): target is string => typeof target === "string") : undefined,
    id: typeof item.id === "string" ? item.id : undefined,
    createdAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
    updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : undefined,
    type: typeof item.type === "string" ? item.type : undefined,
  })).filter((item: VercelEnvStatusItem) => item.key);
  return { ok: true as const, envs };
}
