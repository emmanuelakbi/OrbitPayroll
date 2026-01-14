"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error state for the input */
  error?: boolean;
}

/**
 * Accessible Input component.
 * 
 * WCAG 2.1 AA Compliance:
 * - Visible focus indicators
 * - Minimum touch target size (44px on mobile)
 * - Error state indicated visually and via aria-invalid
 * - Proper disabled state styling
 * 
 * Validates: Requirements 7.2, 7.7
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const isInvalid = error || ariaInvalid === true || ariaInvalid === "true";
    
    return (
      <input
        type={type}
        aria-invalid={isInvalid}
        className={cn(
          // Mobile-first: 44px minimum touch target, can be smaller on desktop
          "flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isInvalid && "border-destructive focus-visible:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
