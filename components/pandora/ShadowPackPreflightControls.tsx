"use client";
import type { ShadowPackPreflightSummary } from "./types";
async function archive(id: string) { await fetch(`/api/pandora/shadow-pack-preflights/${id}/archive`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) }); window.location.reload(); }
export function ShadowPackPreflightControls({ preflight }: { preflight: ShadowPackPreflightSummary }) { return <div className="pd-action-controls"><button className="button-link" type="button" onClick={() => archive(preflight.id)}>Archive</button></div>; }
