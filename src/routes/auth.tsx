import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * Route-only parent for /auth children. Keep page UI in auth.index.tsx so
 * /auth/callback can render independently through this outlet.
 */
export const Route = createFileRoute("/auth")({
  component: () => <Outlet />,
});
