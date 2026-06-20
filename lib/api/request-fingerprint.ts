import { createHash } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";

export type FingerprintInput = {
  namespace: string;
  route: string;
  body: Json;
  idempotencyKey?: string | null;
};

function sortValue(value: Json): Json {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, Json>>((acc, key) => {
        const next = value[key];
        if (next !== undefined) {
          acc[key] = sortValue(next);
        }
        return acc;
      }, {});
  }

  return value;
}

export function stableJsonStringify(value: Json): string {
  return JSON.stringify(sortValue(value));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createRequestHash(body: Json): string {
  return sha256Hex(stableJsonStringify(body));
}

export function createRequestFingerprint(input: FingerprintInput): string {
  return sha256Hex(
    stableJsonStringify({
      body: input.body,
      idempotencyKey: input.idempotencyKey ?? null,
      namespace: input.namespace,
      route: input.route,
    }),
  );
}
