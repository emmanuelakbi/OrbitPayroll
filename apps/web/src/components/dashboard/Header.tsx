"use client";

import * as React from "react";
import { Menu, ChevronDown, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/auth";
import { NotificationBell } from "@/components/notifications";
import { NetworkIndicator } from "@/components/ui/network-indicator";
import type { Organization } from "@/lib/api/types";

interface HeaderProps {
  onMenuClick: () => void;
  organizations: Organization[];
  currentOrg: Organization | null;
  onOrgChange: (orgId: string) => void;
}

/**
 * Dashboard Header with accessible organization switcher.
 * 
 * WCAG 2.1 AA Compliance:
 * - Keyboard navigation for dropdown (7.2)
 * - Proper ARIA attributes for listbox pattern
 * - Focus management within dropdown
 * 
 * Validates: Requirements 7.1, 7.2, 7.3
 */
export function Header({
  onMenuClick,
  organizations,
  currentOrg,
  onOrgChange,
}: HeaderProps) {
  const [showOrgDropdown, setShowOrgDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowOrgDropdown(false);
        setFocusedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for dropdown
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!showOrgDropdown) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setShowOrgDropdown(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < organizations.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : organizations.length - 1
          );
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < organizations.length) {
            onOrgChange(organizations[focusedIndex].id);
            setShowOrgDropdown(false);
            setFocusedIndex(-1);
            buttonRef.current?.focus();
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowOrgDropdown(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;
        case "Tab":
          setShowOrgDropdown(false);
          setFocusedIndex(-1);
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(organizations.length - 1);
          break;
      }
    },
    [showOrgDropdown, organizations, focusedIndex, onOrgChange]
  );

  // Focus the selected item when dropdown opens
  React.useEffect(() => {
    if (showOrgDropdown && focusedIndex >= 0) {
      const items = dropdownRef.current?.querySelectorAll('[role="option"]');
      if (items && items[focusedIndex]) {
        (items[focusedIndex] as HTMLElement).focus();
      }
    }
  }, [showOrgDropdown, focusedIndex]);

  return (
    <header className="sticky top-0 z-30 bg-background border-b" role="banner">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left side - Menu button and org switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Hamburger menu button - 44px touch target on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            aria-expanded="false"
            aria-controls="sidebar-navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>

          {/* Organization Switcher */}
          {organizations.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <Button
                ref={buttonRef}
                variant="outline"
                className="flex items-center gap-2 min-h-[44px] md:min-h-0"
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                onKeyDown={handleKeyDown}
                aria-expanded={showOrgDropdown}
                aria-haspopup="listbox"
                aria-controls="org-listbox"
                aria-label={`Current organization: ${currentOrg?.name || "Select Organization"}`}
              >
                <Building2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline max-w-[150px] truncate">
                  {currentOrg?.name || "Select Organization"}
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              </Button>

              {showOrgDropdown && (
                <div 
                  id="org-listbox"
                  className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-popover border border-border z-50"
                  role="listbox"
                  aria-label="Select organization"
                  aria-activedescendant={
                    focusedIndex >= 0 ? `org-option-${organizations[focusedIndex]?.id}` : undefined
                  }
                  onKeyDown={handleKeyDown}
                >
                  <div className="py-1">
                    <div 
                      className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                      id="org-listbox-label"
                    >
                      Organizations
                    </div>
                    {organizations.map((org, index) => (
                      <button
                        key={org.id}
                        id={`org-option-${org.id}`}
                        onClick={() => {
                          onOrgChange(org.id);
                          setShowOrgDropdown(false);
                          setFocusedIndex(-1);
                          buttonRef.current?.focus();
                        }}
                        role="option"
                        aria-selected={currentOrg?.id === org.id}
                        tabIndex={focusedIndex === index ? 0 : -1}
                        className={`w-full px-4 py-3 text-sm text-left transition-colors flex items-center justify-between min-h-[44px] ${
                          focusedIndex === index
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent active:bg-accent/80"
                        }`}
                      >
                        <span className="truncate">{org.name}</span>
                        {currentOrg?.id === org.id && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side - Notifications and user */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Network Indicator - shows testnet/mock status */}
          <NetworkIndicator compact />

          {/* Notification Bell */}
          <NotificationBell />

          {/* Connect Button / User Menu */}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
