import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import { getSafeRedirect } from "@/lib/auth-redirect";

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
      <div
        className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4"
        aria-live="polite"
      >
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return <>{children}</>;
}
