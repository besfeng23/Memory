export type AdminMemoryRouteGuardExpectation = {
  route: "/admin/memory/browser" | "/admin/memory/audit" | "/admin/memory/verification";
  authenticatedSupabaseSessionRequired: true;
  adminOnly: true;
  readOnly: true;
  namespaceScoped: true;
  serverDerivedUserOnly: true;
  publicReadAllowed: false;
  serviceRoleAllowed: false;
  mutationAllowed: false;
};

export const adminMemoryRouteGuardExpectations: AdminMemoryRouteGuardExpectation[] = [
  "/admin/memory/browser",
  "/admin/memory/audit",
  "/admin/memory/verification",
].map((route) => ({
  route: route as AdminMemoryRouteGuardExpectation["route"],
  authenticatedSupabaseSessionRequired: true,
  adminOnly: true,
  readOnly: true,
  namespaceScoped: true,
  serverDerivedUserOnly: true,
  publicReadAllowed: false,
  serviceRoleAllowed: false,
  mutationAllowed: false,
}));

export function getAdminMemoryRouteGuardExpectation(route: AdminMemoryRouteGuardExpectation["route"]) {
  return adminMemoryRouteGuardExpectations.find((item) => item.route === route);
}
