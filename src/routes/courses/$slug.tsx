import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LearningFeatureGate } from "@/components/LearningFeatureGate";
import { isPremiumCourseAvailable } from "@/lib/feature-access";

export const Route = createFileRoute("/courses/$slug")({
  component: PremiumCourseGate,
});

function PremiumCourseGate() {
  const { slug } = Route.useParams();
  return (
    <LearningFeatureGate
      featureEnabled={isPremiumCourseAvailable(slug)}
      title="Premium Lessons"
      description="Premium BLACKPIPS lessons are currently being prepared. Access will be available soon."
    >
      <Outlet />
    </LearningFeatureGate>
  );
}
