# Implementation Plan: OrbitPayroll Frontend

## Overview

This task list covers the implementation of the Next.js frontend with wallet integration, dashboard UI, and payroll execution flows.

## Tasks

- [x] 1. Frontend Project Setup
  - [x] 1.1 Initialize Next.js 14 application
    - Create `apps/frontend` with App Router
    - Configure TypeScript
    - Set up TailwindCSS and shadcn/ui
    - _Requirements: Technical setup_

  - [x] 1.2 Configure wagmi and RainbowKit
    - Install wagmi, viem, @rainbow-me/rainbowkit
    - Create wagmi config with connectors
    - Set up WagmiProvider
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.3 Set up TanStack Query
    - Install @tanstack/react-query
    - Create QueryClientProvider
    - Configure devtools for development
    - _Requirements: 11.2, 11.3_

  - [x] 1.4 Create API client
    - Implement fetch wrapper with auth
    - Create typed API methods
    - Handle token refresh
    - _Requirements: API integration_

- [x] 2. Landing Page
  - [x] 2.1 Implement landing page
    - Create hero section with value prop
    - Add feature highlights
    - Add "Connect Wallet" CTA
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Authentication Flow
  - [x] 3.1 Implement wallet connection UI
    - Create ConnectButton component
    - Handle connection states
    - Display connected address
    - _Requirements: 2.1, 2.2, 2.3, 2.7_

  - [x] 3.2 Implement SIWE signing flow
    - Request nonce from backend
    - Prompt user to sign message
    - Handle signature and verify
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 3.3 Implement session management
    - Store tokens securely
    - Handle token refresh
    - Implement logout
    - _Requirements: 2.6, 2.8_

  - [x] 3.4 Write property test for auth state consistency
    - **Property 1: Wallet Connection State Consistency**
    - **Validates: Requirements 2.1-2.8**

- [x] 4. Checkpoint - Auth Complete
  - Test wallet connection flow
  - Verify redirect to dashboard after auth

- [x] 5. Dashboard Layout
  - [x] 5.1 Create dashboard layout
    - Implement sidebar navigation
    - Create header with user info
    - Add organization switcher
    - _Requirements: 3.6_

  - [x] 5.2 Implement dashboard overview page
    - Create StatCard components
    - Display treasury balance card
    - Display upcoming payroll card
    - Display next payroll date card
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 5.3 Implement loading and error states
    - Create skeleton loaders
    - Create error boundary
    - Implement retry logic
    - _Requirements: 3.7, 3.8_

- [x] 6. Contractor Management
  - [x] 6.1 Implement contractor list page
    - Create ContractorTable component
    - Implement pagination
    - Implement search input
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.2 Implement contractor form modal
    - Create add contractor form
    - Implement wallet address validation
    - Implement rate validation
    - _Requirements: 4.5, 4.6, 4.7_

  - [x] 6.3 Implement edit contractor flow
    - Pre-fill form with existing data
    - Handle update submission
    - _Requirements: 4.8_

  - [x] 6.4 Implement archive contractor flow
    - Create confirmation modal
    - Handle archive action
    - _Requirements: 4.9, 4.10_

  - [x] 6.5 Write property test for form validation
    - **Property 2: Form Validation Feedback**
    - **Validates: Requirements 4.6, 4.7**

- [x] 7. Treasury Page
  - [x] 7.1 Implement treasury balance display
    - Query balance from contract
    - Format MNEE amount
    - Display contract address with copy
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 7.2 Implement deposit flow
    - Create deposit modal
    - Implement MNEE approval step
    - Implement deposit transaction
    - Show transaction status
    - _Requirements: 5.5, 5.6, 5.7, 5.8_

  - [x] 7.3 Implement transaction history
    - Query deposit/payout events
    - Display with explorer links
    - _Requirements: 5.9_

  - [x] 7.4 Write property test for balance display
    - **Property 5: Payroll Preview Accuracy**
    - **Validates: Requirements 6.2, 6.3**

- [x] 8. Checkpoint - Treasury Complete
  - Test deposit flow on testnet
  - Verify balance updates correctly

- [x] 9. Payroll Execution
  - [x] 9.1 Implement payroll preview page
    - Fetch preview from API
    - Display contractor breakdown
    - Show total and balance comparison
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 9.2 Implement insufficient balance warning
    - Show warning when balance < total
    - Display deficit amount
    - Disable execute button
    - _Requirements: 6.4, 6.5_

  - [x] 9.3 Implement payroll confirmation modal
    - Show gas estimate
    - Require explicit confirmation
    - _Requirements: 6.6, 6.7_

  - [x] 9.4 Implement payroll execution flow
    - Build runPayroll transaction
    - Handle wallet signing
    - Track transaction status
    - _Requirements: 6.8, 6.9_

  - [x] 9.5 Implement transaction status modal
    - Show pending state
    - Show confirming with tx hash
    - Show success/error states
    - _Requirements: 6.9, 6.10, 6.11_

  - [x] 9.6 Record payroll run after confirmation
    - POST run to backend
    - Navigate to history
    - _Requirements: 6.10_

  - [x] 9.7 Write property test for transaction tracking
    - **Property 7: Transaction Status Tracking**
    - **Validates: Requirements 6.8, 6.9, 6.10, 6.11**

- [x] 10. Payroll History
  - [x] 10.1 Implement history list page
    - Create PayrollHistoryTable
    - Display run summary
    - Link to explorer
    - _Requirements: 7.1, 7.2, 7.6_

  - [x] 10.2 Implement run detail view
    - Show contractor payments
    - Display amounts and status
    - _Requirements: 7.4, 7.5_

  - [x] 10.3 Implement CSV export
    - Generate CSV from run data
    - Trigger download
    - _Requirements: 7.7_

- [x] 11. Notifications
  - [x] 11.1 Implement notification bell
    - Show unread count badge
    - Create dropdown menu
    - _Requirements: 8.1, 8.2_

  - [x] 11.2 Implement notification list
    - Display recent notifications
    - Handle mark as read
    - _Requirements: 8.3, 8.4, 8.5, 8.6_

- [x] 12. Error Handling and UX Polish
  - [x] 12.1 Implement toast notifications
    - Create toast component
    - Map error codes to messages
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 12.2 Implement offline indicator
    - Detect network status
    - Show offline banner
    - _Requirements: 9.5_

  - [x] 12.3 Implement confirmation modals
    - Create reusable ConfirmModal
    - Use for destructive actions
    - _Requirements: 9.7_

  - [x] 12.4 Write property test for error messages
    - **Property 4: Error Message Clarity**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [x] 13. Responsive Design
  - [x] 13.1 Implement mobile navigation
    - Create hamburger menu
    - Implement mobile sidebar
    - _Requirements: 10.2_

  - [x] 13.2 Implement responsive tables
    - Convert to card layout on mobile
    - Ensure touch targets are 44px+
    - _Requirements: 10.3, 10.4_

  - [x] 13.3 Test on mobile devices
    - Test iOS Safari
    - Test Android Chrome
    - _Requirements: 10.5, 10.6_

- [x] 14. Development Tools
  - [x] 14.1 Implement feature flags
    - Create mock contract toggle
    - Create testnet indicator
    - _Requirements: 11.1, 11.5_

- [x] 15. Final Checkpoint
  - Run all tests
  - Test complete user flow
  - Ask the user if questions arise

## Notes

- All tasks including property-based tests are required
- Use React Testing Library for component tests
- Use Playwright for E2E tests
