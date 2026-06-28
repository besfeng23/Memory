import { readFileSync } from "fs";
import { discoverEnvKeys } from "../lib/services/env-discovery-service";
import { buildEnvCatalog } from "../lib/services/env-broker-service";

type Allowlist = { allowed: string[] };
const allowlist = JSON.parse(readFileSync("config/env-broker.allowlist.json", "utf8")) as Allowlist;
const catalog = new Set(buildEnvCatalog().map((item) => item.key));
const allowed = new Set(allowlist.allowed);
const discovered = discoverEnvKeys();
const unclassified = discovered.filter((item) => !catalog.has(item.key) && !allowed.has(item.key));
const unknown = discovered.filter((item) => item.classificationSuggestion === "unknown" && !allowed.has(item.key));
const unsafePublic = discovered.filter((item) => item.key.startsWith("NEXT_PUBLIC_") && /(SECRET|TOKEN|PASSWORD|SERVICE_ROLE|DATABASE_URL|DIRECT_URL|PRIVATE|API_KEY)/.test(item.key));
const failures = [...unclassified.map((i) => `uncataloged:${i.key}`), ...unknown.map((i) => `unclassified:${i.key}`), ...unsafePublic.map((i) => `unsafe-public:${i.key}`)];
if (failures.length) {
  console.error("Env Broker policy failed. Add envs to catalog/classification or tracked allowlist.");
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
console.log(`Env Broker policy passed for ${discovered.length} discovered env keys.`);
