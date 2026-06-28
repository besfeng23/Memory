import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/security/api-auth";
import { isBrokerEnabled } from "@/lib/services/env-broker-service";
export async function requireEnvAdmin(mutation = true) { const auth = await requireApiUser(); if (auth.response) return { user: null, response: auth.response }; if (mutation && !isBrokerEnabled()) return { user: null, response: NextResponse.json({ ok: false, error: { code: "broker_disabled", message: "Pandora Env Broker is not enabled." } }, { status: 403 }) }; return { user: auth.user, response: null }; }
