import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/useAuth";
import { getSafeRedirect } from "@/lib/auth-redirect";
import { ContentSkeleton } from "@/components/ContentSkeleton";

export function AuthenticatedRouteGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const destination = useLocation({
    select: (location) => `${location.pathname}${location.searchStr}${location.hash}`,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate({
        to: "/auth",
        search: { redirect: getSafeRedirect(destination) ?? "/" },
        replace: true,
      });
    }
  }, [destination, loading, navigate, user]);

  if (loading || !user) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-4xl items-center px-4">
        <ContentSkeleton className="w-full" lines={4} label="Checking your session" />
      </div>
    );
  }

  return <>{children}</>;
}
