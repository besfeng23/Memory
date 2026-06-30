import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
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

    console.error("Operating API request failed", error);
    return NextResponse.json({ ok: false, error: "Operating request failed." }, { status: 500 });
  }
}

export async function parseJson<TSchema extends z.ZodTypeAny>(request: Request, schema: TSchema): Promise<z.output<TSchema>> {
  const body = await request.json();
  return schema.parse(body);
}
