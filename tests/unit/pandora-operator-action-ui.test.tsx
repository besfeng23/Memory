import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OperatorActionCenterCard } from "@/components/pandora/OperatorActionCenterCard";
import { OperatorActionEnvelope } from "@/components/pandora/OperatorActionEnvelope";
import type { OperatorActionStatus, OperatorActionSummary } from "@/components/pandora/types";

const countsByStatus = { proposed:1, dry_ran:0, approved:0, executing:0, completed:0, blocked:0, failed:0, cancelled:0 };
const base: OperatorActionSummary = { id:"a1", request_id:"req-123", idempotency_key:"abcdef1234567890", action_type:"verify_namespace_invariants", namespace:"real_life", mode:"dry_run", status:"proposed", title:"Verify Namespace Invariants", description:"Safe proposal", result:{ no_mutation_performed: true }, warnings:["Missing smoke evidence"], created_at:"2026-07-03", updated_at:"2026-07-03", event_preview:[{id:"e1", action_id:"a1", user_id:"u1", event_type:"proposed", message:"created", metadata:{}, created_at:"2026-07-03"}] };
describe("OperatorActionCenterCard", () => {
  it("renders empty state", () => { const html=renderToStaticMarkup(<OperatorActionCenterCard data={{actions:[], warnings:[], countsByStatus}} />); expect(html).toContain("No operator actions yet"); expect(html).toContain("Prepare dry-run"); });
  it("renders approved/executing/completed/failed/cancelled statuses", () => { const actions=["approved","executing","completed","failed","cancelled"].map((status,i)=>({...base,id:String(i),status: status as OperatorActionStatus})); const html=renderToStaticMarkup(<OperatorActionCenterCard data={{actions,warnings:[], countsByStatus}} />); for (const s of ["approved","executing","completed","failed","cancelled"]) expect(html).toContain(s); });
  it("envelope shows request_id, warnings, and no mutation performed", () => { const html=renderToStaticMarkup(<OperatorActionEnvelope action={base} />); expect(html).toContain("req-123"); expect(html).toContain("Missing smoke evidence"); expect(html).toContain("No mutation performed"); });
  it("does not render dangerous live action buttons", () => { const html=renderToStaticMarkup(<OperatorActionCenterCard data={{actions:[base], warnings:[], countsByStatus}} />); for (const bad of ["Run live","Delete memory","Prune now","Merge now","Distill now"]) expect(html).not.toContain(bad); });
});
