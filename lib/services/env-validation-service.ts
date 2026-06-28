export type EnvClassification = "secret" | "runtime_flag" | "public_safe" | "provider_token" | "database_url" | "generated_token" | "mode" | "unknown";
export type EnvValidationResult = { ok: true } | { ok: false; code: string; message: string };
const SECRET_RE = /(SECRET|TOKEN|PASSWORD|SERVICE_ROLE|DATABASE_URL|DIRECT_URL)/;
const KEY_RE = /(^|_)KEY$/;

export function classifyEnvKey(key: string): EnvClassification {
  if (key.startsWith("NEXT_PUBLIC_")) return "public_safe";
  if (key === "PANDORA_MEMORY_AUTOPILOT") return "mode";
  if (key.startsWith("PANDORA_ENABLE_") || key.startsWith("PANDORA_AUTO_") || key === "PANDORA_SENSITIVE_MEMORY_REQUIRES_APPROVAL") return "runtime_flag";
  if (key === "PANDORA_INTERNAL_JOB_TOKEN") return "generated_token";
  if (key.includes("VERCEL_API_TOKEN") || key.includes("MANAGEMENT_TOKEN")) return "provider_token";
  if (key === "DATABASE_URL" || key === "DIRECT_URL" || key.endsWith("DATABASE_URL")) return "database_url";
  if (SECRET_RE.test(key) || KEY_RE.test(key)) return "secret";
  if (key.endsWith("_URL") || key.endsWith("_ID")) return "public_safe";
  return "unknown";
}

export function validateEnvKeyValue(key: string, classification: EnvClassification, value?: string, allowedValues?: string[]): EnvValidationResult {
  if (key.startsWith("NEXT_PUBLIC_") && classification !== "public_safe") return { ok: false, code: "invalid_public_secret_name", message: "NEXT_PUBLIC keys cannot be classified as secrets." };
  if (classification === "runtime_flag" && value !== undefined && value !== "true" && value !== "false") return { ok: false, code: "invalid_boolean_flag", message: "Boolean runtime flags must be true or false." };
  if (classification === "mode" && value !== undefined && allowedValues && !allowedValues.includes(value)) return { ok: false, code: "invalid_mode", message: "Mode value is not allowed." };
  return { ok: true };
}

export function redactErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message.replace(/[A-Za-z0-9_\-]{20,}/g, "[redacted]") : "[redacted_error]";
}
