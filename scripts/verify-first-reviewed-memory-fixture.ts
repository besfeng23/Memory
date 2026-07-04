import { buildAllFirstReviewedMemoryFixtures } from "../lib/services/first-reviewed-memory-fixture-builder";
import { runManualWorkflowFixtureHarness } from "../lib/services/operator-manual-workflow-fixture-harness";

export async function runFirstReviewedMemoryFixtureCli() {
  const lines = [
    "TEST-ONLY FIXTURE HARNESS",
    "NO PRODUCTION WRITES",
    "NO MODEL CALLS",
    "NO SEMANTIC RETRIEVAL",
  ];
  const results = [];
  for (const fixture of buildAllFirstReviewedMemoryFixtures()) {
    const result = await runManualWorkflowFixtureHarness({ fixture });
    results.push(result);
    lines.push(`${result.ok ? "PASS" : "FAIL"} ${result.scenario} blocked=${result.expectedBlocked} productionSeed=${result.safeSummary.productionSeed} publicPersistence=${result.safeSummary.publicPersistenceEnabled}`);
  }
  return { ok: results.every((r) => r.ok), output: `${lines.join("\n")}\n` };
}

async function main() {
  const result = await runFirstReviewedMemoryFixtureCli();
  process.stdout.write(result.output);
  if (!result.ok) process.exit(1);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/verify-first-reviewed-memory-fixture.ts")) {
  main().catch(() => { console.error("FAIL fixture harness error (redacted)"); process.exit(1); });
}
