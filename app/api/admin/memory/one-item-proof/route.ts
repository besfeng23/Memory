import { createOneItemExecutionProofRouteHandler } from "@/lib/api/one-item-execution-proof-route-handler";
const handler = createOneItemExecutionProofRouteHandler();
export const GET = handler.GET;
export const POST = handler.POST;
