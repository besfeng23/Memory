import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { AuthenticationRequiredError } from "@/lib/security/auth";

export async function withOperatingApi<T>(handler: () => Promise<T>) {
  try {
    const data = await handler();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid request body.", issues: error.flatten() }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function parseJson<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}
