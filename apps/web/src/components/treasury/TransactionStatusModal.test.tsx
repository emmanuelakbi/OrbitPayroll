/**
 * Unit Tests: TransactionStatusModal Component
 *
 * Tests for the TransactionStatusModal component that displays blockchain
 * transaction status (pending, confirming, success, error).
 *
 * **Feature: 09-testing**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TransactionStatusModal, type TransactionStatus } from "./TransactionStatusModal";

// Helper to get the main action button (not the dialog's X close button)
const getMainActionButton = () => {
  const footer = document.querySelector(".flex.justify-end");
  if (!footer) return null;
  return within(footer as HTMLElement).queryByRole("button");
};

describe("TransactionStatusModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Idle Status", () => {
    it("renders idle state correctly", () => {
      const status: TransactionStatus = { status: "idle" };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("Transaction")).toBeInTheDocument();
    });

    it("allows closing in idle state", () => {
      const status: TransactionStatus = { status: "idle" };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      const closeButton = getMainActionButton();
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton!);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Pending Status", () => {
    it("renders pending state with message", () => {
      const status: TransactionStatus = {
        status: "pending",
        message: "Waiting for wallet confirmation...",
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("Processing Transaction")).toBeInTheDocument();
      expect(screen.getByText("Please confirm the transaction in your wallet")).toBeInTheDocument();
      expect(screen.getByText("Waiting for wallet confirmation...")).toBeInTheDocument();
    });

    it("shows loading spinner in pending state", () => {
      const status: TransactionStatus = {
        status: "pending",
        message: "Processing...",
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      // Check for spinner (Loader2 icon with animate-spin class)
      const spinner = document.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeInTheDocument();
    });

    it("does not show close button in pending state", () => {
      const status: TransactionStatus = {
        status: "pending",
        message: "Processing...",
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      // The main action button (Close/Done) should not be present
      const mainButton = getMainActionButton();
      expect(mainButton).toBeNull();
    });
  });

  describe("Confirming Status", () => {
    const txHash = "0x" + "a".repeat(64);

    it("renders confirming state with transaction hash", () => {
      const status: TransactionStatus = {
        status: "confirming",
        txHash,
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("Confirming Transaction")).toBeInTheDocument();
      expect(screen.getByText("Waiting for blockchain confirmation")).toBeInTheDocument();
      expect(screen.getByText("Transaction submitted. Waiting for confirmation...")).toBeInTheDocument();
    });

    it("shows Etherscan link in confirming state", () => {
      const status: TransactionStatus = {
        status: "confirming",
        txHash,
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      const link = screen.getByText("View on Etherscan");
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", expect.stringContaining(txHash));
    });

    it("shows loading spinner in confirming state", () => {
      const status: TransactionStatus = {
        status: "confirming",
        txHash,
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      const spinner = document.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeInTheDocument();
    });

    it("does not show close button in confirming state", () => {
      const status: TransactionStatus = {
        status: "confirming",
        txHash,
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      // The main action button (Close/Done) should not be present
      const mainButton = getMainActionButton();
      expect(mainButton).toBeNull();
    });
  });

  describe("Success Status", () => {
    const txHash = "0x" + "b".repeat(64);

    it("renders success state correctly", () => {
      const status: TransactionStatus = {
        status: "success",
        txHash,
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("Transaction Successful")).toBeInTheDocument();
      expect(screen.getByText("Your transaction has been confirmed")).toBeInTheDocument();
      expect(screen.getByText("Transaction confirmed successfully!")).toBeInTheDocument();
    });

    it("shows Etherscan link in success state", () => {
      const status: TransactionStatus = {
        status: "success",
        txHash,
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      const link = screen.getByText("View on Etherscan");
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", expect.stringContaining(txHash));
    });

    it("shows Done button in success state", () => {
      const status: TransactionStatus = {
        status: "success",
        txHash,
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      const mainButton = getMainActionButton();
      expect(mainButton).toBeInTheDocument();
      expect(mainButton).toHaveTextContent("Done");
    });

    it("calls onClose when Done button is clicked", () => {
      const status: TransactionStatus = {
        status: "success",
        txHash,
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      const doneButton = getMainActionButton();
      fireEvent.click(doneButton!);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Error Status", () => {
    it("renders error state with error message", () => {
      const status: TransactionStatus = {
        status: "error",
        error: "Transaction rejected by user",
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("Transaction Failed")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong with your transaction")).toBeInTheDocument();
      expect(screen.getByText("Transaction rejected by user")).toBeInTheDocument();
    });

    it("shows Close button in error state", () => {
      const status: TransactionStatus = {
        status: "error",
        error: "Network error",
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      const mainButton = getMainActionButton();
      expect(mainButton).toBeInTheDocument();
      expect(mainButton).toHaveTextContent("Close");
    });

    it("calls onClose when Close button is clicked", () => {
      const status: TransactionStatus = {
        status: "error",
        error: "Network error",
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      const closeButton = getMainActionButton();
      fireEvent.click(closeButton!);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Modal Behavior", () => {
    it("does not render when open is false", () => {
      const status: TransactionStatus = { status: "idle" };

      render(
        <TransactionStatusModal
          open={false}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText("Transaction")).not.toBeInTheDocument();
    });

    it("prevents closing during pending state", () => {
      const status: TransactionStatus = {
        status: "pending",
        message: "Processing...",
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      // The main action button (Close/Done) should not be present during pending
      const mainButton = getMainActionButton();
      expect(mainButton).toBeNull();
    });

    it("prevents closing during confirming state", () => {
      const status: TransactionStatus = {
        status: "confirming",
        txHash: "0x" + "a".repeat(64),
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      // The main action button (Close/Done) should not be present during confirming
      const mainButton = getMainActionButton();
      expect(mainButton).toBeNull();
    });
  });

  describe("Etherscan Links", () => {
    it("opens Etherscan link in new tab", () => {
      const txHash = "0x" + "c".repeat(64);
      const status: TransactionStatus = {
        status: "success",
        txHash,
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      const link = screen.getByText("View on Etherscan").closest("a");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("uses Sepolia Etherscan URL by default", () => {
      const txHash = "0x" + "d".repeat(64);
      const status: TransactionStatus = {
        status: "success",
        txHash,
      };

      render(
        <TransactionStatusModal
          open={true}
          onOpenChange={mockOnOpenChange}
          transactionStatus={status}
          onClose={mockOnClose}
        />
      );

      const link = screen.getByText("View on Etherscan").closest("a");
      expect(link).toHaveAttribute("href", expect.stringContaining("sepolia.etherscan.io"));
    });
  });
});
