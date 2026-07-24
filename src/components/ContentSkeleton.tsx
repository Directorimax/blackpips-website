import { cn } from "@/lib/utils";

type ContentSkeletonProps = {
  className?: string;
  lines?: number;
  label?: string;
};

/** A consistent, accessible content placeholder for route and card loading states. */
export function ContentSkeleton({
  className,
  lines = 3,
  label = "Loading content",
}: ContentSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("glass animate-pulse rounded-3xl p-6 sm:p-8", className)}
    >
      <span className="sr-only">{label}</span>
      <div className="h-3 w-28 rounded-full bg-muted" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={cn("h-3 rounded-full bg-muted/80", index === lines - 1 ? "w-2/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}
