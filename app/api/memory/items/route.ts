import { createPersistedMemoryReadRouteHandler, rejectPersistedMemoryReadMutation } from "@/lib/api/persisted-memory-read-route-handler";
const handler = createPersistedMemoryReadRouteHandler({}, "listItems");
export function GET(request: Request) {
  return handler(request as never);
}
export const POST = () => rejectPersistedMemoryReadMutation("POST");
export const PUT = () => rejectPersistedMemoryReadMutation("PUT");
export const PATCH = () => rejectPersistedMemoryReadMutation("PATCH");
export const DELETE = () => rejectPersistedMemoryReadMutation("DELETE");
