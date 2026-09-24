import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";

export const Route = createFileRoute("/courses/$slug/$lessonSlug")({
  component: PremiumLessonRedirect,
});

function PremiumLessonRedirect() {
  const { slug } = Route.useParams();
  return (
    <AuthenticatedRouteGuard>
      <Navigate to="/courses/$slug" params={{ slug }} replace />
    </AuthenticatedRouteGuard>
  );
}
