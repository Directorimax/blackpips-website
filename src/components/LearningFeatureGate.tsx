import type { ReactNode } from "react";
import { ComingSoon } from "@/components/ComingSoon";
import { ContentSkeleton } from "@/components/ContentSkeleton";
import { useAdmin } from "@/hooks/useAdmin";
import { canAccessLearningFeature } from "@/lib/learning-preview";

export function LearningFeatureGate({
  featureEnabled,
  title,
  description,
  children,
}: {
  featureEnabled: boolean;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { isAdmin, loading } = useAdmin();

  if (loading)
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-4xl items-center px-4">
        <ContentSkeleton className="w-full" lines={4} label="Checking learning access" />
      </div>
    );

  if (!canAccessLearningFeature(featureEnabled, isAdmin))
    return <ComingSoon title={title} description={description} />;

  return <>{children}</>;
}
