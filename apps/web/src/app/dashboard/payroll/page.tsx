"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useDashboard, DashboardSkeleton, QueryError } from "@/components/dashboard";
import {
  PayrollPreviewCard,
  PayrollSummaryCard,
  PayrollConfirmModal,
  PayrollExecutionProvider,
  usePayrollExecution,
} from "@/components/payroll";
import { TransactionStatusModal } from "@/components/treasury";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Play, RefreshCw } from "lucide-react";

function PayrollPageContent() {
  const { currentOrg, isLoading: orgLoading } = useDashboard();
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  
  const {
    transactionStatus,
    showTxModal,
    gasEstimate,
    isEstimatingGas,
    isExecuting,
    executePayroll,
    estimateGas,
    closeTxModal,
  } = usePayrollExecution();

  // Fetch payroll preview
  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ["payroll-preview", currentOrg?.id],
    queryFn: () => api.payroll.preview(currentOrg!.id),
    enabled: !!currentOrg?.id,
    retry: 2,
  });

  const isLoading = orgLoading || previewLoading;
  const treasuryAddress = currentOrg?.treasuryAddress;

  // Handle opening confirm modal
  const handleOpenConfirmModal = React.useCallback(() => {
    if (preview && treasuryAddress) {
      estimateGas(preview, treasuryAddress);
      setConfirmModalOpen(true);
    }
  }, [preview, treasuryAddress, estimateGas]);

  // Handle confirm execution
  const handleConfirmExecution = React.useCallback(() => {
    if (preview && treasuryAddress && currentOrg) {
      setConfirmModalOpen(false);
      executePayroll(preview, treasuryAddress, currentOrg.id);
    }
  }, [preview, treasuryAddress, currentOrg, executePayroll]);

  // Determine if execute button should be disabled
  const canExecute =
    preview &&
    preview.isSufficient &&
    preview.contractors.length > 0 &&
    !isExecuting;

  if (orgLoading) {
    return <DashboardSkeleton />;
  }

  if (!currentOrg) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  if (!treasuryAddress) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No treasury configured for this organization
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Please set up a treasury address in organization settings
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header - Responsive layout */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Run Payroll</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Review and execute payroll for your contractors
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="default"
            onClick={() => refetchPreview()}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Refresh
          </Button>
          <Button
            onClick={handleOpenConfirmModal}
            disabled={!canExecute}
            size="default"
            className="w-full sm:w-auto"
          >
            <Play className="h-4 w-4 mr-2" aria-hidden="true" />
            Execute Payroll
          </Button>
        </div>
      </div>

      {/* Error State */}
      {previewError && (
        <QueryError
          error={previewError as Error}
          title="Failed to load payroll preview"
          onRetry={() => refetchPreview()}
        />
      )}

      {/* Payroll Content */}
      {!previewError && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contractor Breakdown - Takes 2 columns */}
          <div className="lg:col-span-2">
            <PayrollPreviewCard preview={preview} isLoading={isLoading} />
          </div>

          {/* Summary Card */}
          <div>
            <PayrollSummaryCard preview={preview} isLoading={isLoading} />
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {preview && (
        <PayrollConfirmModal
          open={confirmModalOpen}
          onOpenChange={setConfirmModalOpen}
          preview={preview}
          gasEstimate={gasEstimate}
          isEstimatingGas={isEstimatingGas}
          onConfirm={handleConfirmExecution}
          isExecuting={isExecuting}
        />
      )}

      {/* Transaction Status Modal */}
      <TransactionStatusModal
        open={showTxModal}
        onOpenChange={(open) => {
          if (!open) closeTxModal();
        }}
        transactionStatus={transactionStatus}
        onClose={closeTxModal}
      />
    </div>
  );
}

export default function PayrollPage() {
  return (
    <PayrollExecutionProvider>
      <PayrollPageContent />
    </PayrollExecutionProvider>
  );
}
