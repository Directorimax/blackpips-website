import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/useAuth";
import { buildInternalLocationPath, getSafeRedirect } from "@/lib/auth-redirect";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const intendedUrlRef = useRef(buildInternalLocationPath(location));
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigate({
        to: "/auth",
        search: { redirect: getSafeRedirect(intendedUrlRef.current) ?? undefined },
        replace: true,
      });
    }
  }, [loading, navigate, user]);

  if (loading || !user) return null;
  return <Outlet />;
}
