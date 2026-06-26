"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { approveMemoryProposal, createMemoryProposal, persistApprovedMemoryProposal, rejectMemoryProposal, requestMemoryProposalRevision } from "@/lib/services/memory-proposal-service";

function text(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function num(formData: FormData, key: string) { const value = text(formData, key); return value ? Number(value) : undefined; }
async function deps() { return { supabase: await createSupabaseServerClient() as never, session: await resolvePandoraServerSession(), runtime: resolvePandoraRuntimeSafetyConfig() }; }
function fail(message: string): never { throw new Error(message); }

export async function createProposalAction(formData: FormData) {
  const { supabase, session, runtime } = await deps();
  const result = await createMemoryProposal(supabase, { namespace: (text(formData, "namespace") ?? "real_life") as "real_life" | "au", title: text(formData, "title"), memory_text: text(formData, "memory_text") ?? "", memory_type: text(formData, "memory_type"), source_type: text(formData, "source_type"), source_ref: text(formData, "source_ref"), confidence: num(formData, "confidence") }, session, runtime);
  if (!result.ok) fail(result.error);
  revalidatePath("/admin/memory/proposals");
  redirect(`/admin/memory/proposals/${result.data.id}`);
}
export async function approveProposalAction(formData: FormData) { const { supabase, session, runtime } = await deps(); const id = text(formData, "id") ?? fail("id required"); const r = await approveMemoryProposal(supabase, id, "server-action", session, runtime); if (!r.ok) fail(r.error); revalidatePath(`/admin/memory/proposals/${id}`); }
export async function rejectProposalAction(formData: FormData) { const { supabase, session, runtime } = await deps(); const id = text(formData, "id") ?? fail("id required"); const r = await rejectMemoryProposal(supabase, id, text(formData, "reason") ?? "Rejected by operator.", "server-action", session, runtime); if (!r.ok) fail(r.error); revalidatePath(`/admin/memory/proposals/${id}`); }
export async function reviseProposalAction(formData: FormData) { const { supabase, session, runtime } = await deps(); const id = text(formData, "id") ?? fail("id required"); const r = await requestMemoryProposalRevision(supabase, id, text(formData, "note") ?? "Revision requested by operator.", "server-action", session, runtime); if (!r.ok) fail(r.error); revalidatePath(`/admin/memory/proposals/${id}`); }
export async function persistProposalAction(formData: FormData) { const { supabase, session, runtime } = await deps(); const id = text(formData, "id") ?? fail("id required"); const r = await persistApprovedMemoryProposal(supabase, id, "server-action", session, runtime); if (!r.ok) fail(r.error); revalidatePath(`/admin/memory/proposals/${id}`); revalidatePath("/admin/memory/browser"); }
