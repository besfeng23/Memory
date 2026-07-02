export type PandoraMcpEnvStatus = { ok: true; value: string; envVar: string } | { ok: false; envVar: string; aliases: string[]; message: string };

function firstPresent(env: Partial<NodeJS.ProcessEnv>, names: string[]): PandoraMcpEnvStatus {
  const found = names.find((name) => Boolean(env[name]));
  if (found) return { ok: true, value: String(env[found]), envVar: found };
  return { ok: false, envVar: names[0], aliases: names.slice(1), message: `Missing server env: ${names[0]}` };
}

export function getPandoraMcpBearerSecret(env: Partial<NodeJS.ProcessEnv> = process.env) {
  return firstPresent(env, ["PANDORA_MCP_TOKEN", "PANDORA_MCP_API_KEY", "PANDORA_API_KEY", "MEMORY_API_KEY"]);
}

export function getPandoraMcpDbKey(env: Partial<NodeJS.ProcessEnv> = process.env) {
  return firstPresent(env, ["PANDORA_MCP_DB_KEY", "PANDORA_MEMORY_BRIDGE_DB_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
}

export function getPandoraSupabaseUrl(env: Partial<NodeJS.ProcessEnv> = process.env) {
  return firstPresent(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
}

export function presentEnvName(env: Partial<NodeJS.ProcessEnv>, names: string[]) {
  return names.find((name) => Boolean(env[name])) ?? null;
}
