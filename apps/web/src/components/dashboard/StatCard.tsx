"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * Accessible Stat Card component for displaying metrics.
 * 
 * WCAG 2.1 AA Compliance:
 * - Proper heading structure
 * - Trend information uses text, not just color/icons
 * - Loading state announced to screen readers
 * 
 * Validates: Requirements 7.1, 7.3, 7.5
 */
export function StatCard({
  title,
  value,
  subtitle,
  description,
  icon,
  trend,
  trendValue,
  isLoading = false,
  className,
}: StatCardProps) {
  const trendLabel = trend === "up" ? "increased" : trend === "down" ? "decreased" : "unchanged";
  
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-2">
        {icon && (
          <div 
            className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2" role="status" aria-label={`Loading ${title}`}>
            <div className="h-8 w-24 bg-muted animate-pulse rounded" aria-hidden="true" />
            <div className="h-4 w-16 bg-muted animate-pulse rounded" aria-hidden="true" />
            <span className="sr-only">Loading {title}...</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold" aria-label={`${title}: ${value}`}>{value}</p>
              {trend && trendValue && (
                <span
                  className={cn(
                    "flex items-center text-sm font-medium",
                    trend === "up" && "text-green-500",
                    trend === "down" && "text-red-500",
                    trend === "neutral" && "text-muted-foreground"
                  )}
                  aria-label={`${trendLabel} by ${trendValue}`}
                >
                  {trend === "up" && <TrendingUp className="h-4 w-4 mr-1" aria-hidden="true" />}
                  {trend === "down" && <TrendingDown className="h-4 w-4 mr-1" aria-hidden="true" />}
                  {trend === "neutral" && <Minus className="h-4 w-4 mr-1" aria-hidden="true" />}
                  {trendValue}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
