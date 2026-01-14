"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkipLinkProps {
  /** The ID of the main content element to skip to */
  targetId?: string;
  /** Custom text for the skip link */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Skip to main content link for keyboard navigation.
 * 
 * This component provides a way for keyboard users to skip
 * repetitive navigation and jump directly to the main content.
 * 
 * WCAG 2.1 AA Compliance:
 * - Provides bypass mechanism for repetitive content (2.4.1)
 * - Visible on focus for keyboard users
 * - High contrast for visibility
 * 
 * Validates: Requirements 7.1, 7.2
 * 
 * Usage:
 * 1. Add <SkipLink /> at the top of your layout
 * 2. Add id="main-content" to your main content area
 */
export function SkipLink({
  targetId = "main-content",
  children = "Skip to main content",
  className,
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Hidden by default, visible on focus
        "absolute -top-10 left-4 z-[200] px-4 py-2 rounded-md",
        "bg-primary text-primary-foreground font-medium",
        "transition-all duration-200",
        "focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        // Ensure it's above everything
        "focus:z-[200]",
        className
      )}
    >
      {children}
    </a>
  );
}

/**
 * Main content wrapper that can receive focus from skip link.
 * 
 * Usage:
 * <MainContent>
 *   <YourPageContent />
 * </MainContent>
 */
export function MainContent({
  children,
  className,
  id = "main-content",
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      id={id}
      tabIndex={-1}
      className={cn("outline-none", className)}
      {...props}
    >
      {children}
    </main>
  );
}
