"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMnee } from "@/lib/utils";
import { formatAddress } from "@/lib/auth";
import { Wallet, Copy, Check, ExternalLink, AlertCircle } from "lucide-react";

interface TreasuryBalanceCardProps {
  balance: string;
  contractAddress: string;
  upcomingPayroll?: string;
  isLoading?: boolean;
  onDeposit: () => void;
}

/**
 * Accessible Treasury Balance Card component.
 * 
 * WCAG 2.1 AA Compliance:
 * - Proper heading structure
 * - Copy button has accessible label and feedback
 * - Alert for insufficient balance uses role="alert"
 * - External links indicate they open in new window
 * 
 * Validates: Requirements 7.1, 7.3, 7.5
 */
export function TreasuryBalanceCard({
  balance,
  contractAddress,
  upcomingPayroll,
  isLoading = false,
  onDeposit,
}: TreasuryBalanceCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyAddress = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  }, [contractAddress]);

  // Calculate if balance is sufficient
  const balanceBigInt = BigInt(balance || "0");
  const upcomingBigInt = BigInt(upcomingPayroll || "0");
  const isSufficient = balanceBigInt >= upcomingBigInt;
  const deficit = upcomingBigInt - balanceBigInt;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" aria-hidden="true" />
            Treasury Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" role="status" aria-label="Loading treasury balance">
          <Skeleton className="h-12 w-32" aria-hidden="true" />
          <Skeleton className="h-4 w-48" aria-hidden="true" />
          <Skeleton className="h-10 w-full" aria-hidden="true" />
          <span className="sr-only">Loading treasury balance...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" aria-hidden="true" />
          Treasury Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div>
          <p className="text-4xl font-bold" aria-label={`Treasury balance: ${formatMnee(balance)} MNEE`}>
            {formatMnee(balance)}
          </p>
          <p className="text-sm text-muted-foreground" aria-hidden="true">MNEE</p>
        </div>

        {/* Contract Address - Responsive layout */}
        <div className="flex flex-col gap-2 p-3 bg-muted rounded-lg sm:flex-row sm:items-center">
          <span className="text-sm text-muted-foreground" id="contract-label">Contract:</span>
          <code className="text-sm font-mono break-all" aria-labelledby="contract-label">
            {formatAddress(contractAddress)}
          </code>
          <div className="flex gap-1 mt-2 sm:mt-0 sm:ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-0 sm:h-8 sm:w-8"
              onClick={handleCopyAddress}
              aria-label={copied ? "Address copied" : "Copy contract address"}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-0 sm:h-8 sm:w-8"
              asChild
            >
              <a
                href={`https://sepolia.etherscan.io/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View contract on Etherscan (opens in new tab)"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>

        {/* Upcoming Payroll Comparison */}
        {upcomingPayroll && (
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Upcoming Payroll:</dt>
              <dd className="font-medium">{formatMnee(upcomingPayroll)} MNEE</dd>
            </div>
            {!isSufficient && (
              <div 
                className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Insufficient Balance</p>
                  <p className="text-muted-foreground">
                    You need {formatMnee(deficit.toString())} more MNEE
                  </p>
                </div>
              </div>
            )}
          </dl>
        )}

        {/* Deposit Button */}
        <Button onClick={onDeposit} className="w-full">
          Deposit MNEE
        </Button>
      </CardContent>
    </Card>
  );
}
