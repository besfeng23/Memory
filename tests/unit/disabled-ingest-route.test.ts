import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/memory/ingest/route";

describe("disabled ingest route", () => {
  it("returns 501 without enabling ingest", async () => {
    const response = POST();
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("not_implemented");
    expect(body.status).toBe("disabled_stub");
  });
});
