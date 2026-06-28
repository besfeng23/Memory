import { randomBytes } from "crypto";
import { fingerprintEnvValue } from "@/lib/services/env-fingerprint-service";

export function generateEnvSecret(byteLength = 48): { value: string; fingerprint: string } {
  const value = randomBytes(byteLength).toString("base64url");
  return { value, fingerprint: fingerprintEnvValue(value) };
}
