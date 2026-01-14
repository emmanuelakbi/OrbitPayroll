import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge variants with accessible color combinations.
 * 
 * WCAG 2.1 AA Compliance:
 * - All color combinations meet 4.5:1 contrast ratio
 * - Does not rely solely on color (uses text labels)
 * 
 * Validates: Requirements 7.4, 7.5
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Success variant with accessible contrast
        success:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
        // Warning variant with accessible contrast
        warning:
          "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Accessible label for screen readers (if badge text is not descriptive) */
  "aria-label"?: string;
}

/**
 * Accessible Badge component for status indicators.
 * 
 * WCAG 2.1 AA Compliance:
 * - Uses text labels, not just color
 * - Meets color contrast requirements
 * - Supports aria-label for additional context
 * 
 * Validates: Requirements 7.4, 7.5
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(badgeVariants({ variant }), className)} 
      role="status"
      {...props} 
    />
  );
}

export { Badge, badgeVariants };
