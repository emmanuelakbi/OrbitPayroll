"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

export interface FormFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text for the field */
  label: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below the input */
  helperText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Custom ID for the input (auto-generated if not provided) */
  fieldId?: string;
}

/**
 * Accessible form field component with proper ARIA attributes.
 * Combines label, input, error message, and helper text with proper associations.
 * 
 * WCAG 2.1 AA Compliance:
 * - Labels are properly associated with inputs via htmlFor/id
 * - Error messages are announced via aria-describedby and role="alert"
 * - Required fields are indicated via aria-required
 * - Invalid state is indicated via aria-invalid
 * 
 * Validates: Requirements 7.1, 7.2, 7.3
 */
const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      fieldId,
      className,
      ...props
    },
    ref
  ) => {
    // Generate unique IDs for accessibility associations
    const generatedId = React.useId();
    const id = fieldId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    // Build aria-describedby based on what's present
    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className={cn("space-y-2", className)}>
        <Label
          htmlFor={id}
          className={cn(
            "flex items-center gap-1",
            error && "text-destructive"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only">(required)</span>}
        </Label>

        <Input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-required={required}
          aria-describedby={describedBy}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
          {...props}
        />

        {error && (
          <p
            id={errorId}
            className="text-sm text-destructive flex items-center gap-1"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={helperId}
            className="text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = "FormField";

export { FormField };
