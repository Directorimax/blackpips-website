import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/useAuth";
import { buildInternalLocationPath, getSafeRedirect } from "@/lib/auth-redirect";
import { ContentSkeleton } from "@/components/ContentSkeleton";

export function AuthenticatedRouteGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const destination = useLocation({ select: buildInternalLocationPath });
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (user) {
      hasRedirectedRef.current = false;
      return;
    }
    if (!loading && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigate({
        to: "/auth",
        search: { redirect: getSafeRedirect(destination) ?? undefined },
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
