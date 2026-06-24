import { createFirstLiveAppendProofCaptureRouteHandler } from "@/lib/api/first-live-append-proof-capture-route-handler";
const handler = createFirstLiveAppendProofCaptureRouteHandler();
export const GET = handler.GET;
export const POST = handler.POST;
