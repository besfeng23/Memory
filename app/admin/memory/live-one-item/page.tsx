"use client";

import { FormEvent, useMemo, useState } from "react";

const copy = [
  "Internal operator workflow",
  "One approved review item only",
  "Public persistence is disabled",
  "Production ingest writes are disabled",
  "Execution requires typed confirmation: APPEND MEMORY",
  "No model calls, embeddings, or semantic retrieval",
  "All memory persistence remains append-only",
  "Audit verification is required",
  "AU/story memory cannot become real-life evidence",
  "Real-life memory cannot enter AU unless explicitly fictionalized and reviewed",
];

type ExecutionResponse = {
  ok?: boolean;
  executed?: boolean;
  blockers?: string[];
  warnings?: string[];
  receipt?: Record<string, unknown>;
  proof?: Record<string, unknown>;
  gates?: Record<string, unknown>;
  message?: string;
};

const initialState = {
  namespace: "real_life",
  reviewItemId: "",
  decisionId: "",
  idempotencyKey: "",
  typedConfirmation: "",
  operatorToken: "",
  title: "First controlled live append proof",
  sourceRef: "",
  memoryText: "",
};

function fingerprintSeed() {
  const now = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  return `first-live-append-${now}`;
}

export default function LiveOneItemMemoryWorkflowPage() {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<ExecutionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = useMemo(() => {
    return (
      (form.namespace === "real_life" || form.namespace === "au") &&
      form.reviewItemId.trim().length > 0 &&
      form.decisionId.trim().length > 0 &&
      form.idempotencyKey.trim().length >= 8 &&
      form.typedConfirmation === "APPEND MEMORY" &&
      form.operatorToken.trim().length >= 16 &&
      form.memoryText.trim().length > 0
    );
  }, [form]);

  function update(name: keyof typeof initialState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function generateIdempotencyKey() {
    update("idempotencyKey", fingerprintSeed());
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResponse(null);

    if (!ready) {
      setError("Execution is not ready. Fill every required field and type APPEND MEMORY exactly.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await fetch("/api/admin/memory/live-one-item", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-pandora-internal-persistence-mode": "approved-review-executor",
          "x-pandora-internal-operator-token": form.operatorToken.trim(),
        },
        body: JSON.stringify({
          namespace: form.namespace,
          reviewItemId: form.reviewItemId.trim(),
          decisionId: form.decisionId.trim(),
          idempotencyKey: form.idempotencyKey.trim(),
          typedConfirmation: form.typedConfirmation,
          title: form.title.trim() || "First controlled live append proof",
          sourceRef: form.sourceRef.trim() || `review:${form.reviewItemId.trim()}`,
          memoryText: form.memoryText.trim(),
          metadata: {
            operatorConsole: true,
            proofOnly: true,
            oneItemOnly: true,
            appendOnly: true,
          },
        }),
      });

      const json = (await result.json().catch(() => ({ message: "Non-JSON response from execution endpoint." }))) as ExecutionResponse;
      setResponse(json);
      if (!result.ok || !json.executed) {
        setError(json.message ?? `Execution returned HTTP ${result.status}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown execution error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Live one-item memory workflow</h1>
      <section aria-label="Safety banner">
        {copy.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <section aria-label="Operator console" style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 24 }}>
        <h2>Operator execution console</h2>
        <p>This form sends exactly one reviewed memory append request using your logged-in Supabase session. It does not enable public memory, retrieval, models, embeddings, GPT Actions, or MCP.</p>

        <form onSubmit={onSubmit}>
          <label>
            Namespace
            <select name="namespace" value={form.namespace} onChange={(event) => update("namespace", event.target.value)}>
              <option value="real_life">real_life</option>
              <option value="au">au</option>
            </select>
          </label>

          <label>
            Review item id
            <input name="reviewItemId" value={form.reviewItemId} onChange={(event) => update("reviewItemId", event.target.value)} />
          </label>

          <label>
            Decision id
            <input name="decisionId" value={form.decisionId} onChange={(event) => update("decisionId", event.target.value)} />
          </label>

          <label>
            Idempotency key
            <input name="idempotencyKey" value={form.idempotencyKey} onChange={(event) => update("idempotencyKey", event.target.value)} />
          </label>
          <button type="button" onClick={generateIdempotencyKey}>Generate idempotency key</button>

          <label>
            Internal operator token
            <input name="operatorToken" type="password" autoComplete="off" value={form.operatorToken} onChange={(event) => update("operatorToken", event.target.value)} />
          </label>

          <label>
            Title
            <input name="title" value={form.title} onChange={(event) => update("title", event.target.value)} />
          </label>

          <label>
            Source ref
            <input name="sourceRef" value={form.sourceRef} onChange={(event) => update("sourceRef", event.target.value)} placeholder="review:<reviewItemId>" />
          </label>

          <label>
            Memory text for the single proof item
            <textarea name="memoryText" rows={5} value={form.memoryText} onChange={(event) => update("memoryText", event.target.value)} />
          </label>

          <label>
            Typed confirmation
            <input name="typedConfirmation" value={form.typedConfirmation} placeholder="APPEND MEMORY" onChange={(event) => update("typedConfirmation", event.target.value)} />
          </label>

          <button type="submit" disabled={!ready || submitting}>{submitting ? "Executing one-item proof..." : "Execute one controlled append"}</button>
        </form>
      </section>

      {error ? <section role="alert"><h2>Execution blocker</h2><p>{error}</p></section> : null}
      {response ? <section aria-label="Execution response"><h2>Receipt panel</h2><pre>{JSON.stringify(response, null, 2)}</pre></section> : null}

      <section><h2>Readiness panel</h2></section>
      <section><h2>Live dry-run panel</h2></section>
      <section><h2>Preview panel</h2></section>
      <section><h2>Execution gate panel</h2></section>
      <section><h2>Readback panel</h2></section>
      <section><h2>Browser visibility panel</h2></section>
      <section><h2>Audit verification panel</h2></section>
    </main>
  );
}
