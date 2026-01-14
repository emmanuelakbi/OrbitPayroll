/**
 * Unit Tests: PayrollPreviewCard and PayrollSummaryCard Components
 *
 * Tests for the payroll preview components that display contractor breakdown
 * and payment summary information.
 *
 * **Feature: 09-testing**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PayrollPreviewCard, PayrollSummaryCard } from "./PayrollPreviewCard";
import type { PayrollPreview } from "@/lib/api/types";

// Helper to create mock payroll preview
const createMockPreview = (overrides: Partial<PayrollPreview> = {}): PayrollPreview => ({
  contractors: [
    {
      id: "contractor-1",
      name: "Alice",
      walletAddress: "0x1111111111111111111111111111111111111111",
      amount: "1000000000000000000000", // 1000 MNEE
    },
    {
      id: "contractor-2",
      name: "Bob",
      walletAddress: "0x2222222222222222222222222222222222222222",
      amount: "2000000000000000000000", // 2000 MNEE
    },
  ],
  total: "3000000000000000000000", // 3000 MNEE
  treasuryBalance: "5000000000000000000000", // 5000 MNEE
  isSufficient: true,
  ...overrides,
});

describe("PayrollPreviewCard", () => {
  describe("Rendering", () => {
    it("renders contractor breakdown correctly", () => {
      const preview = createMockPreview();

      render(<PayrollPreviewCard preview={preview} />);

      // Check title
      expect(screen.getByText("Contractor Breakdown")).toBeInTheDocument();

      // Check contractor names
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();

      // Check wallet addresses are truncated
      expect(screen.getByText("0x1111...1111")).toBeInTheDocument();
      expect(screen.getByText("0x2222...2222")).toBeInTheDocument();
    });

    it("renders loading skeleton when isLoading is true", () => {
      render(<PayrollPreviewCard preview={undefined} isLoading={true} />);

      expect(screen.getByText("Payroll Preview")).toBeInTheDocument();
      // Skeleton elements should be present
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders empty state when no contractors", () => {
      const preview = createMockPreview({ contractors: [] });

      render(<PayrollPreviewCard preview={preview} />);

      expect(screen.getByText("No active contractors to pay")).toBeInTheDocument();
      expect(screen.getByText("Add contractors to run payroll")).toBeInTheDocument();
    });

    it("renders empty state when preview is undefined", () => {
      render(<PayrollPreviewCard preview={undefined} />);

      expect(screen.getByText("No active contractors to pay")).toBeInTheDocument();
    });
  });

  describe("Contractor Display", () => {
    it("displays all contractors in the preview", () => {
      const preview = createMockPreview({
        contractors: [
          { id: "1", name: "Alice", walletAddress: "0x" + "1".repeat(40), amount: "1000000000000000000000" },
          { id: "2", name: "Bob", walletAddress: "0x" + "2".repeat(40), amount: "2000000000000000000000" },
          { id: "3", name: "Charlie", walletAddress: "0x" + "3".repeat(40), amount: "3000000000000000000000" },
        ],
        total: "6000000000000000000000",
      });

      render(<PayrollPreviewCard preview={preview} />);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });

    it("displays MNEE currency label for each contractor", () => {
      const preview = createMockPreview();

      render(<PayrollPreviewCard preview={preview} />);

      // Each contractor row should have MNEE label
      const mneeLabels = screen.getAllByText("MNEE");
      expect(mneeLabels.length).toBe(preview.contractors.length);
    });
  });
});

describe("PayrollSummaryCard", () => {
  describe("Rendering", () => {
    it("renders payment summary correctly", () => {
      const preview = createMockPreview();

      render(<PayrollSummaryCard preview={preview} />);

      expect(screen.getByText("Payment Summary")).toBeInTheDocument();
      expect(screen.getByText("Total Payroll")).toBeInTheDocument();
    });

    it("renders loading skeleton when isLoading is true", () => {
      render(<PayrollSummaryCard preview={undefined} isLoading={true} />);

      expect(screen.getByText("Payment Summary")).toBeInTheDocument();
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("returns null when preview is undefined and not loading", () => {
      const { container } = render(<PayrollSummaryCard preview={undefined} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Balance Information", () => {
    it("displays treasury balance", () => {
      const preview = createMockPreview();

      render(<PayrollSummaryCard preview={preview} />);

      expect(screen.getByText("Treasury Balance:")).toBeInTheDocument();
    });

    it("displays required amount", () => {
      const preview = createMockPreview();

      render(<PayrollSummaryCard preview={preview} />);

      expect(screen.getByText("Required Amount:")).toBeInTheDocument();
    });

    it("displays after payroll balance", () => {
      const preview = createMockPreview();

      render(<PayrollSummaryCard preview={preview} />);

      expect(screen.getByText("After Payroll:")).toBeInTheDocument();
    });
  });

  describe("Sufficient Balance", () => {
    it("shows positive balance when funds are sufficient", () => {
      const preview = createMockPreview({
        total: "1000000000000000000000", // 1000 MNEE
        treasuryBalance: "5000000000000000000000", // 5000 MNEE
        isSufficient: true,
      });

      render(<PayrollSummaryCard preview={preview} />);

      // Should not show insufficient balance warning
      expect(screen.queryByText("Insufficient Balance")).not.toBeInTheDocument();
    });

    it("displays contractor count", () => {
      const preview = createMockPreview();

      render(<PayrollSummaryCard preview={preview} />);

      expect(screen.getByText("2 contractors will be paid")).toBeInTheDocument();
    });

    it("displays singular contractor text for one contractor", () => {
      const preview = createMockPreview({
        contractors: [
          { id: "1", name: "Alice", walletAddress: "0x" + "1".repeat(40), amount: "1000000000000000000000" },
        ],
        total: "1000000000000000000000",
      });

      render(<PayrollSummaryCard preview={preview} />);

      expect(screen.getByText("1 contractor will be paid")).toBeInTheDocument();
    });
  });

  describe("Insufficient Balance Warning", () => {
    it("shows warning when balance is insufficient", () => {
      const preview = createMockPreview({
        total: "5000000000000000000000", // 5000 MNEE
        treasuryBalance: "1000000000000000000000", // 1000 MNEE
        isSufficient: false,
      });

      render(<PayrollSummaryCard preview={preview} />);

      expect(screen.getByText("Insufficient Balance")).toBeInTheDocument();
      expect(screen.getByText(/You need .* more MNEE to run payroll/)).toBeInTheDocument();
    });

    it("does not show warning when balance is sufficient", () => {
      const preview = createMockPreview({
        isSufficient: true,
      });

      render(<PayrollSummaryCard preview={preview} />);

      expect(screen.queryByText("Insufficient Balance")).not.toBeInTheDocument();
    });
  });
});
