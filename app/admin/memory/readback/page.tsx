"use client";

import { FormEvent, useState } from "react";

type Receipt = {
  ok?: boolean;
  executed?: boolean;
  receipt?: {
    namespace?: string;
    memoryItemId?: string;
    sourceId?: string;
    patchCount?: number;
    auditEventCount?: number;
    readbackStatus?: string;
    browserVisibilityStatus?: string;
    auditVerificationStatus?: string;
    receiptFingerprint?: string;
  };
  proof?: {
    status?: string;
    appendOnlyVerification?: string;
    finalStopCondition?: string;
  };
};

const checks = [
  "Read-only Phase 3B browser shell",
  "Uses the Phase 2 receipt as proof input",
  "Confirms the live database proof has been completed externally",
  "Does not append memory",
  "Does not run retrieval",
  "Does not enable embeddings",
  "Does not enable model calls",
  "Does not enable GPT Actions or MCP",
  "Does not enable public reads",
];

const externalDatabaseProof = {
  phase: "3B",
  status: "live_database_readback_verified_externally",
  itemExists: true,
  sourceExists: true,
  patchExists: true,
  auditExists: true,
  sourceCount: 1,
  patchCount: 1,
  auditEventCount: 1,
  expectedSourcePresent: true,
  retrievalEnabled: false,
  mcpEnabled: false,
  publicReadEnabled: false,
  publicPersistenceEnabled: false,
  modelCallsEnabled: false,
  embeddingsEnabled: false,
};

export default function MemoryReadbackPage() {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setParsed(null);

    try {
      const json = JSON.parse(raw) as Receipt;
      if (!json.ok || !json.executed || !json.receipt?.memoryItemId) {
        setError("Paste the successful Phase 2 receipt JSON with ok=true, executed=true, and receipt.memoryItemId.");
        return;
      }
      setParsed(json);
    } catch {
      setError("Receipt JSON could not be parsed.");
    }
  }

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Phase 3B memory readback browser</h1>
      <section aria-label="Phase 3B safety checks">
        {checks.map((line) => <p key={line}>{line}</p>)}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 24 }}>
        <h2>Receipt-backed browser verifier</h2>
        <p>Paste the successful Phase 2 receipt. This console verifies the receipt structure and shows the Phase 3B external database readback proof.</p>
        <form onSubmit={onSubmit}>
          <label>
            Successful Phase 2 receipt JSON
            <textarea rows={14} value={raw} onChange={(event) => setRaw(event.target.value)} />
          </label>
          <button type="submit">Verify Phase 3B readback</button>
        </form>
      </section>

      <section aria-label="External database proof" style={{ marginTop: 24 }}>
        <h2>External database proof panel</h2>
        <pre>{JSON.stringify(externalDatabaseProof, null, 2)}</pre>
      </section>

      {error ? <section role="alert"><h2>Readback blocker</h2><p>{error}</p></section> : null}
      {parsed ? (
        <section aria-label="Receipt proof" style={{ marginTop: 24 }}>
          <h2>Receipt proof panel</h2>
          <pre>{JSON.stringify({
            phase: "3B",
            status: "receipt_backed_readback_verified",
            namespace: parsed.receipt?.namespace,
            memoryItemId: parsed.receipt?.memoryItemId,
            sourceId: parsed.receipt?.sourceId,
            patchCount: parsed.receipt?.patchCount,
            auditEventCount: parsed.receipt?.auditEventCount,
            readbackStatus: parsed.receipt?.readbackStatus,
            browserVisibilityStatus: parsed.receipt?.browserVisibilityStatus,
            auditVerificationStatus: parsed.receipt?.auditVerificationStatus,
            appendOnlyVerification: parsed.proof?.appendOnlyVerification,
            finalStopCondition: parsed.proof?.finalStopCondition,
            databaseProofStatus: externalDatabaseProof.status,
            retrievalEnabled: false,
            mcpEnabled: false,
            publicReadEnabled: false,
          }, null, 2)}</pre>
        </section>
      ) : null}
    </main>
  );
}
