import { createMemoryIngestRouteHandler } from "@/lib/api/memory-ingest-route-handler";
import { getCurrentUser } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

export const POST = createMemoryIngestRouteHandler({
  resolveUser: getCurrentUser,
  env: () => process.env,
});
