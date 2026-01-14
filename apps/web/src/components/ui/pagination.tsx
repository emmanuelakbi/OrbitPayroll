"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Accessible Pagination component with responsive design.
 * 
 * WCAG 2.1 AA Compliance:
 * - Proper navigation landmark
 * - Accessible labels for all buttons
 * - Current page indicated with aria-current
 * - Touch targets meet 44px minimum on mobile
 * 
 * Responsive Design:
 * - Shows fewer page numbers on mobile
 * - Touch-friendly button sizes
 * 
 * Validates: Requirements 7.1, 7.2, 8.1, 8.3
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  // Generate page numbers to display - fewer on mobile
  const getPageNumbers = (isMobile: boolean): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = isMobile ? 3 : 5;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > (isMobile ? 2 : 3)) {
        pages.push("ellipsis");
      }

      // Show pages around current
      const start = Math.max(2, currentPage - (isMobile ? 0 : 1));
      const end = Math.min(totalPages - 1, currentPage + (isMobile ? 0 : 1));

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - (isMobile ? 1 : 2)) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  const desktopPages = getPageNumbers(false);
  const mobilePages = getPageNumbers(true);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>

      {/* Desktop pagination */}
      <div className="hidden sm:flex items-center gap-1">
        {desktopPages.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-10 w-10 items-center justify-center"
              aria-hidden="true"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </Button>
          )
        )}
      </div>

      {/* Mobile pagination - simplified */}
      <div className="flex sm:hidden items-center gap-1">
        {mobilePages.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-mobile-${index}`}
              className="flex h-11 w-8 items-center justify-center"
              aria-hidden="true"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </Button>
          )
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}

// Simple pagination info display
interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

/**
 * Pagination info component showing current range.
 * 
 * Responsive Design:
 * - Shorter text on mobile
 * 
 * Validates: Requirements 8.1, 8.4
 */
export function PaginationInfo({
  currentPage,
  totalItems,
  itemsPerPage,
}: PaginationInfoProps) {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <p className="text-sm text-muted-foreground">
      <span className="hidden sm:inline">Showing </span>
      {start}-{end}
      <span className="hidden sm:inline"> of {totalItems} results</span>
      <span className="sm:hidden"> / {totalItems}</span>
    </p>
  );
}
