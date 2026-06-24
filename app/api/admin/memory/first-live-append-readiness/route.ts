import { createFirstLiveAppendReadinessLockRouteHandler } from "@/lib/api/first-live-append-readiness-lock-route-handler";
const handler = createFirstLiveAppendReadinessLockRouteHandler();
export const GET = handler.GET;
export const POST = handler.POST;
