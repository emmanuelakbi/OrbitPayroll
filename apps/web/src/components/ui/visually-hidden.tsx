"use client";

import * as React from "react";

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Content to be hidden visually but available to screen readers */
  children: React.ReactNode;
  /** If true, content becomes visible when focused (for skip links) */
  focusable?: boolean;
}

/**
 * Visually Hidden component for screen reader only content.
 * 
 * This component hides content visually while keeping it accessible
 * to screen readers. Use it for:
 * - Additional context for screen reader users
 * - Labels for icon-only buttons
 * - Skip links and navigation aids
 * 
 * WCAG 2.1 AA Compliance:
 * - Provides additional context for assistive technologies (7.3)
 * - Does not affect visual layout
 * 
 * Validates: Requirements 7.3
 * 
 * @example
 * // Icon button with screen reader label
 * <button>
 *   <SearchIcon />
 *   <VisuallyHidden>Search</VisuallyHidden>
 * </button>
 * 
 * @example
 * // Additional context for a link
 * <a href="/profile">
 *   View profile
 *   <VisuallyHidden> for John Doe</VisuallyHidden>
 * </a>
 */
export function VisuallyHidden({
  children,
  focusable = false,
  ...props
}: VisuallyHiddenProps) {
  return (
    <span
      {...props}
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
        // If focusable, show on focus
        ...(focusable && {
          ":focus": {
            position: "static",
            width: "auto",
            height: "auto",
            padding: "inherit",
            margin: "inherit",
            overflow: "visible",
            clip: "auto",
            whiteSpace: "normal",
          },
        }),
      }}
    >
      {children}
    </span>
  );
}

/**
 * Alias for VisuallyHidden - commonly used name
 */
export const SrOnly = VisuallyHidden;
