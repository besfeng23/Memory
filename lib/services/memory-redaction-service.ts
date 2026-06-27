const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /sb_[A-Za-z0-9_-]{20,}/g,
  /vercel_[A-Za-z0-9_-]{20,}/gi,
  /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
  /(password|passwd|pwd|api[_-]?key|secret|token)\s*[:=]\s*[^\s,;]{8,}/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /\b(?:\d[ -]*?){13,19}\b/g,
  /\b[A-Za-z0-9_\-]{32,}\b/g,
];
export type SecretDetection = { detected: boolean; matches: { type: string; start: number; end: number }[] };
export function detectSecrets(input: string): SecretDetection {
  const matches: SecretDetection["matches"] = [];
  for (const pattern of SECRET_PATTERNS) for (const match of input.matchAll(pattern)) matches.push({ type: pattern.source.slice(0, 32), start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
  return { detected: matches.length > 0, matches };
}
export function redactSecrets(input: string) { return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[REDACTED_SECRET]"), input); }
export function assertNoSecretsForModel(input: string) { const d = detectSecrets(input); if (d.detected) throw new Error("secret_detected_before_model_call"); }
export function assertNoSecretsForEmbedding(input: string) { const d = detectSecrets(input); if (d.detected) throw new Error("secret_detected_before_embedding"); }
