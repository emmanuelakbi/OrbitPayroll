import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accessible label describing what is loading */
  "aria-label"?: string;
}

/**
 * Accessible Skeleton loading component.
 * 
 * WCAG 2.1 AA Compliance:
 * - Uses aria-busy to indicate loading state
 * - Supports aria-label for screen reader context
 * - Animation respects prefers-reduced-motion
 * 
 * Validates: Requirements 7.3
 */
export function Skeleton({ className, "aria-label": ariaLabel, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted motion-reduce:animate-none",
        className
      )}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel || "Loading..."}
      {...props}
    >
      <span className="sr-only">{ariaLabel || "Loading..."}</span>
    </div>
  );
}
