import { createLiveOneReviewedItemWorkflowRouteHandler } from "@/lib/api/live-one-reviewed-item-workflow-route-handler";
const handler = createLiveOneReviewedItemWorkflowRouteHandler();
export const GET = handler.GET;
export const POST = handler.POST;
