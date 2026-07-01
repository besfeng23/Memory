"use client";

import { useState } from "react";

function field(form: HTMLFormElement, key: string) {
  const value = new FormData(form).get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function send(path: string, payload: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Save failed.");
}

export function ProjectPanel({ projectKey }: Readonly<{ projectKey: string }>) {
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving...");
    try {
      await send(`/api/operating/projects/${projectKey}/tasks`, {
        title: field(event.currentTarget, "title"),
        description: field(event.currentTarget, "description") || undefined,
        proof_required: field(event.currentTarget, "proof_required") || undefined,
      });
      setMessage("Saved. Refreshing...");
      window.location.reload();
    } catch {
      setMessage("Save failed. Check required fields.");
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      {message ? <p className="empty-inline">{message}</p> : null}
      <label className="form-field"><span>Task</span><input name="title" required /></label>
      <label className="form-field"><span>Description</span><textarea name="description" rows={3} /></label>
      <label className="form-field"><span>Proof required</span><textarea name="proof_required" rows={3} /></label>
      <button className="button-link button-link--primary" type="submit">Add task</button>
    </form>
  );
}
