import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";

export const Route = createFileRoute("/courses")({
  component: () => (
    <AuthenticatedRouteGuard>
      <Outlet />
    </AuthenticatedRouteGuard>
  ),
});
