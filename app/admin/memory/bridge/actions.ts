/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { revalidatePath } from "next/cache";
import { resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { captureMemoryEvent, createContextPack } from "@/lib/services/memory-bridge-service";
import type { MemoryBridgePrincipal } from "@/lib/services/memory-bridge-auth";
import type { MemoryBridgeNamespace, MemoryEvent } from "@/lib/services/memory-bridge-service";
import { buildDailyContextPack, buildMasterContextPack } from "@/lib/services/memory-distillation-service";

function value(formData: FormData, key: string) { const v = formData.get(key); return typeof v === "string" ? v.trim() : undefined; }
async function sessionPrincipal(): Promise<MemoryBridgePrincipal> {
  const session = await resolvePandoraServerSession();
  if (!session.ok) return { ok: false, blockers: ["auth_required"] };
  const operator = Boolean(session.session.isInternalOperator || session.session.isPersistenceOperator || session.session.adminCapabilities?.some((capability) => ["memory:bridge", "memory:phase-4a", "memory:capture", "memory:context"].includes(capability)));
  if (!operator) return { ok: false, blockers: ["operator_required"] };
  return { ok: true, userId: session.session.userId, createdBy: session.session.userId, authType: "session", operator: true };
}
export async function captureBridgeMemoryAction(formData: FormData) {
  const supabase = await createSupabaseServerClient() as any;
  await captureMemoryEvent(supabase, { namespace: value(formData, "namespace"), source: value(formData, "source"), raw_text: value(formData, "raw_text"), importance: Number(value(formData, "importance") ?? 0), sensitivity: value(formData, "sensitivity") }, await sessionPrincipal(), resolvePandoraRuntimeSafetyConfig());
  revalidatePath("/admin/memory/bridge");
}
export async function distillBridgeContextAction(formData: FormData) {
  const supabase = await createSupabaseServerClient() as any;
  const principal = await sessionPrincipal();
  if (!principal.ok) return;
  const namespace = (value(formData, "namespace") || "real_life") as MemoryBridgeNamespace;
  const packType = value(formData, "pack_type") === "master" ? "master" : "daily";
  const events = await (supabase.from("memory_events").select("*").eq("user_id", principal.userId).eq("namespace", namespace).neq("status", "archived").order("created_at", { ascending: false }).limit(packType === "master" ? 50 : 25) as unknown as Promise<{ data: MemoryEvent[] | null }>);
  const pack = packType === "master" ? buildMasterContextPack(namespace, principal.userId, events.data ?? []) : buildDailyContextPack(namespace, principal.userId, events.data ?? []);
  await createContextPack(supabase, pack, principal, resolvePandoraRuntimeSafetyConfig());
  revalidatePath("/admin/memory/bridge");
}
