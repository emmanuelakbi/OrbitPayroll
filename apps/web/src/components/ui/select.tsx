"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  /** Error state for the select */
  error?: boolean;
  /** Accessible label (required if no visible label) */
  "aria-label"?: string;
}

/**
 * Accessible Select component.
 * 
 * WCAG 2.1 AA Compliance:
 * - Uses native select element for full keyboard support
 * - Visible focus indicators
 * - Minimum touch target size (44px on mobile)
 * - Error state indicated visually and via aria-invalid
 * 
 * Validates: Requirements 7.2, 7.7
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, error, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const isInvalid = error || ariaInvalid === true || ariaInvalid === "true";
    
    return (
      <div className="relative">
        <select
          aria-invalid={isInvalid}
          className={cn(
            // Mobile-first: 44px minimum touch target, can be smaller on desktop
            "flex h-11 md:h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            isInvalid && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown 
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" 
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
