import { NextRequest, NextResponse } from "next/server";
import { getEnvBrokerStatus } from "@/lib/services/env-broker-service";
import { ENV_ADMIN_COOKIE_NAME, getConfiguredOperatorTokens, requireEnvAdmin, safeEqual } from "@/lib/services/env-admin-route-guard";

export async function GET() {
  const guard = await requireEnvAdmin(false);
  if (guard.response) return guard.response;
  return NextResponse.json(getEnvBrokerStatus());
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const candidate = String(form.get("operator_key") ?? "").trim();
  const valid = getConfiguredOperatorTokens().some((configured) => safeEqual(candidate, configured));
  if (!valid) return NextResponse.json({ ok: false, error: { code: "invalid_operator_key", message: "Env Broker operator unlock was not accepted." } }, { status: 401 });

  const response = NextResponse.redirect(new URL("/admin/env", request.url), { status: 303 });
  response.cookies.set({ name: ENV_ADMIN_COOKIE_NAME, value: candidate, httpOnly: true, sameSite: "strict", secure: true, path: "/", maxAge: 60 * 30 });
  return response;
}
