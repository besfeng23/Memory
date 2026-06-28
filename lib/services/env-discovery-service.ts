import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { classifyEnvKey, type EnvClassification } from "@/lib/services/env-validation-service";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";

export type EnvDiscoverySource = { file: string; line: number };
export type EnvDiscoveryItem = { key: string; sources: EnvDiscoverySource[]; classificationSuggestion: EnvClassification; defaultSuggestion?: string; requiredSuggestion: boolean; providerTargetSuggestion: "vercel" | "github" | "supabase" | "unknown" };
const DEFAULT_SCAN = ["app", "lib", "docs", ".github/workflows", "README.md", "vercel.json", "next.config.js", "next.config.mjs", "next.config.ts", "supabase/config.toml"];
const KEY_RE = /(?:process\.env\.([A-Z][A-Z0-9_]+)|process\.env\[['"]([A-Z][A-Z0-9_]+)['"]\]|(?:^|[^A-Z0-9_])((?:PANDORA_|NEXT_PUBLIC_|SUPABASE_|OPENAI_|DATABASE_URL|DIRECT_URL|AUTH_|NEXTAUTH_|SESSION_|COOKIE_|VERCEL_)[A-Z0-9_]*)(?==))/g;

const knownDefaults: Record<string, string> = Object.fromEntries(Object.values(resolvePandoraRuntimeSafetyConfig({}).gates).map((gate) => [gate.envVar, gate.envVar === "PANDORA_SENSITIVE_MEMORY_REQUIRES_APPROVAL" ? "true" : "false"]));
knownDefaults.PANDORA_MEMORY_AUTOPILOT = "off";
knownDefaults.PANDORA_ENV_BROKER_ENABLED = "true";

const mustRegister = [
  "PANDORA_INTERNAL_JOB_TOKEN", "PANDORA_ENV_BROKER_ENABLED", "PANDORA_VERCEL_API_TOKEN", "PANDORA_ENV_VAULT_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "DATABASE_URL", "DIRECT_URL", "OPENAI_API_KEY", "OPENAI_PROJECT_ID", "OPENAI_ORG_ID", "NEXTAUTH_SECRET", "AUTH_SECRET", "NEXTAUTH_URL", "AUTH_URL", "SESSION_SECRET", "COOKIE_SECRET",
];

export function discoverEnvKeys(root = process.cwd()): EnvDiscoveryItem[] {
  const found = new Map<string, EnvDiscoverySource[]>();
  for (const envVar of Object.values(resolvePandoraRuntimeSafetyConfig({}).gates).map((g) => g.envVar)) add(found, envVar, { file: "lib/config/pandora-runtime-safety-config.ts", line: 1 });
  for (const key of mustRegister) add(found, key, { file: "env-broker-known-catalog", line: 1 });
  for (const rel of DEFAULT_SCAN) scanPath(join(root, rel), rel, found);
  return [...found.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, sources]) => ({ key, sources, classificationSuggestion: classifyEnvKey(key), defaultSuggestion: knownDefaults[key], requiredSuggestion: key.startsWith("PANDORA_") && key !== "PANDORA_ENV_VAULT_KEY", providerTargetSuggestion: key.includes("SUPABASE") ? "supabase" : "vercel" }));
}

function add(map: Map<string, EnvDiscoverySource[]>, key: string, source: EnvDiscoverySource) { if (!map.has(key)) map.set(key, []); map.get(key)?.push(source); }
function scanPath(abs: string, rel: string, map: Map<string, EnvDiscoverySource[]>) {
  let stat; try { stat = statSync(abs); } catch { return; }
  if (stat.isDirectory()) { for (const name of readdirSync(abs)) { if (["node_modules", ".next", ".git", ".env", ".vercel", ".supabase", "secrets"].includes(name)) continue; scanPath(join(abs, name), `${rel}/${name}`, map); } return; }
  if (!/\.(ts|tsx|js|mjs|json|md|toml|yml|yaml|example)$/.test(abs)) return;
  const lines = readFileSync(abs, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => { for (const m of line.matchAll(KEY_RE)) { const key = m[1] || m[2] || m[3]; if (key && /^[A-Z][A-Z0-9_]+$/.test(key) && !["PANDORA_VERCEL_PROJECT", "PANDORA_AUTOPILOT_VALUES"].includes(key)) add(map, key, { file: rel, line: index + 1 }); } });
}
