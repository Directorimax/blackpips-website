import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";
import { FEATURE_ACCESS } from "@/lib/feature-access";

export const Route = createFileRoute("/courses/$slug")({
  component: () =>
    FEATURE_ACCESS.premiumLessonsEnabled ? (
      <Outlet />
    ) : (
      <ComingSoon
        title="Premium Lessons"
        description="Premium BLACKPIPS lessons are currently being prepared. Access will be available soon."
      />
    ),
});
