import { describe, expect, it } from "vitest";
import { getPandoraMcpBearerSecret, getPandoraMcpDbKey, getPandoraSupabaseUrl } from "@/lib/services/pandora-mcp-env";
import { resolvePandoraMcpPrincipal } from "@/lib/services/mcp-auth";

function req(token: string) { return new Request("https://example.com/api/mcp", { headers: { authorization: `Bearer ${token}` } }); }

describe("Pandora MCP environment aliases", () => {
  it("accepts deployed API key aliases and service-role db key aliases", () => {
    expect(getPandoraMcpBearerSecret({ PANDORA_MCP_API_KEY: "tool-key" })).toMatchObject({ ok: true, envVar: "PANDORA_MCP_API_KEY" });
    expect(getPandoraMcpDbKey({ SUPABASE_SERVICE_ROLE_KEY: "service-role" })).toMatchObject({ ok: true, envVar: "SUPABASE_SERVICE_ROLE_KEY" });
    expect(getPandoraSupabaseUrl({ SUPABASE_URL: "https://example.supabase.co" })).toMatchObject({ ok: true, envVar: "SUPABASE_URL" });
  });

  it("reports a missing server env instead of generic invalid API key when no MCP token is configured", () => {
    const result = resolvePandoraMcpPrincipal(req("tool-key"), { PANDORA_ENABLE_MCP: "true", PANDORA_MCP_USER_ID: "user-1", SUPABASE_SERVICE_ROLE_KEY: "service-role" });
    expect(result).toMatchObject({ ok: false, code: "mcp_token_env_missing", message: "Missing server env: PANDORA_MCP_TOKEN" });
  });

  it("reports disabled capture and distillation with explicit env names", async () => {
    const { requireMcpCaptureEnabled, requireMcpDistillationEnabled } = await import("@/lib/services/mcp-auth");
    expect(requireMcpCaptureEnabled({ PANDORA_ENABLE_MCP_CAPTURE: "false" }).message).toBe("capture_disabled: PANDORA_ENABLE_MCP_CAPTURE is not true");
    expect(requireMcpDistillationEnabled({ PANDORA_ENABLE_MCP_DISTILLATION: "false" }).message).toBe("distillation_disabled: PANDORA_ENABLE_MCP_DISTILLATION is not true");
  });
});
