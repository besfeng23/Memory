import { createPersistedMemoryReadRouteHandler, rejectPersistedMemoryReadMutation } from "@/lib/api/persisted-memory-read-route-handler";
const handler = createPersistedMemoryReadRouteHandler({}, "listPatches");
export function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handler(request as never, context);
}
export const POST = () => rejectPersistedMemoryReadMutation("POST");
export const PUT = () => rejectPersistedMemoryReadMutation("PUT");
export const PATCH = () => rejectPersistedMemoryReadMutation("PATCH");
export const DELETE = () => rejectPersistedMemoryReadMutation("DELETE");
