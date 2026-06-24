import { createSafePersistencePhaseCloseRouteHandler } from "@/lib/api/safe-persistence-phase-close-route-handler";
const handler = createSafePersistencePhaseCloseRouteHandler();
export const GET = handler.GET;
export const POST = handler.POST;
