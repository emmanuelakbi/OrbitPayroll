# Implementation Plan: OrbitPayroll Product

## Overview

This task list covers the end-to-end implementation of OrbitPayroll's core product features. Tasks are organized to build incrementally, starting with authentication and progressing through organization management, contractors, treasury, and payroll execution.

## Tasks

- [ ] 1. Project Setup and Authentication Foundation
  - [ ] 1.1 Initialize monorepo structure with Next.js frontend and Express backend
    - Create `apps/frontend` and `apps/backend` directories
    - Configure TypeScript, ESLint, Prettier
    - Set up shared types package
    - _Requirements: 9.1_

  - [ ] 1.2 Implement wallet connection UI with RainbowKit
    - Install wagmi, viem, @rainbow-me/rainbowkit
    - Create WalletProvider component
    - Implement connect/disconnect flow
    - _Requirements: 1.1, 1.2_

  - [ ] 1.3 Implement SIWE authentication backend
    - Create nonce generation endpoint
    - Implement signature verification
    - Issue JWT tokens on success
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ] 1.4 Write property test for authentication flow
    - **Property 1: Authentication Flow Integrity**
    - **Validates: Requirements 1.2, 1.3, 1.4**

- [ ] 2. Checkpoint - Authentication Complete
  - Ensure wallet connection and auth flow works end-to-end
  - Verify JWT tokens are issued correctly

- [ ] 3. Organization Management
  - [ ] 3.1 Implement organization creation API
    - Create POST /orgs endpoint
    - Set creator as OWNER_ADMIN
    - Generate treasury address placeholder
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Implement organization listing and details API
    - Create GET /orgs and GET /orgs/:id endpoints
    - Filter by user membership
    - _Requirements: 2.3_

  - [ ] 3.3 Implement organization UI pages
    - Create organization list page
    - Create organization creation modal
    - Implement organization switcher in sidebar
    - _Requirements: 2.1, 2.3_

  - [ ] 3.4 Write property test for organization ownership
    - **Property 4: Organization Ownership Invariant**
    - **Validates: Requirements 2.5, 2.6**

- [ ] 4. Contractor Management
  - [ ] 4.1 Implement contractor CRUD API
    - Create POST, GET, PUT, DELETE endpoints
    - Implement wallet address validation
    - Implement soft delete (archive)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 4.2 Implement contractor list UI
    - Create ContractorTable component
    - Implement pagination
    - Implement search/filter
    - _Requirements: 3.6_

  - [ ] 4.3 Implement contractor form modal
    - Create add/edit contractor form
    - Implement real-time validation
    - Handle wallet address formatting
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ] 4.4 Write property test for contractor wallet uniqueness
    - **Property 6: Contractor Wallet Uniqueness**
    - **Validates: Requirements 3.5**

- [ ] 5. Checkpoint - Core CRUD Complete
  - Ensure organizations and contractors can be created and managed
  - Verify role-based access control works

- [ ] 6. Treasury Integration
  - [ ] 6.1 Implement treasury balance display
    - Create treasury API endpoint
    - Query MNEE balance from contract
    - Display in TreasuryCard component
    - _Requirements: 4.1_

  - [ ] 6.2 Implement deposit flow UI
    - Create deposit modal
    - Implement MNEE approval step
    - Implement deposit transaction
    - _Requirements: 4.2, 4.3_

  - [ ] 6.3 Implement treasury history
    - Query deposit and payout events
    - Display transaction list with explorer links
    - _Requirements: 4.6_

  - [ ] 6.4 Write property test for treasury balance accuracy
    - **Property 8: Treasury Balance Accuracy**
    - **Validates: Requirements 4.1, 4.3**

- [ ] 7. Payroll Execution
  - [ ] 7.1 Implement payroll preview API
    - Calculate total from active contractors
    - Compare against treasury balance
    - Return preview with deficit calculation
    - _Requirements: 5.3_

  - [ ] 7.2 Implement payroll preview UI
    - Create PayrollPreview component
    - Display contractor breakdown
    - Show insufficient balance warning
    - _Requirements: 5.3, 4.4, 4.5_

  - [ ] 7.3 Implement payroll execution flow
    - Build runPayroll transaction
    - Handle transaction signing
    - Track confirmation status
    - _Requirements: 5.4, 5.5_

  - [ ] 7.4 Implement payroll run recording
    - POST run metadata to backend after tx confirms
    - Store tx hash and item breakdown
    - _Requirements: 5.5_

  - [ ] 7.5 Write property test for payroll calculation
    - **Property 9: Payroll Calculation Correctness**
    - **Validates: Requirements 5.3**

- [ ] 8. Checkpoint - Payroll Flow Complete
  - Ensure full payroll flow works: preview → execute → record
  - Verify on-chain transaction succeeds

- [ ] 9. Payroll History and Audit
  - [ ] 9.1 Implement payroll history API
    - Create GET /orgs/:id/payroll-runs endpoint
    - Include pagination
    - _Requirements: 6.1_

  - [ ] 9.2 Implement payroll history UI
    - Create PayrollHistoryTable component
    - Display run details with tx links
    - _Requirements: 6.1, 6.3_

  - [ ] 9.3 Implement payroll run detail view
    - Show individual contractor payments
    - Link to block explorer
    - _Requirements: 6.2_

- [ ] 10. Role-Based Access Control
  - [ ] 10.1 Implement RBAC middleware
    - Create authorization middleware
    - Check org membership and role
    - Return 403 for unauthorized actions
    - _Requirements: 7.2, 7.5, 7.6_

  - [ ] 10.2 Implement role-based UI restrictions
    - Hide admin-only actions for Finance_Operator
    - Show appropriate error messages
    - _Requirements: 7.2, 7.3, 7.4_

  - [ ] 10.3 Write property test for RBAC enforcement
    - **Property 12: Role-Based Access Control Enforcement**
    - **Validates: Requirements 7.2, 7.4, 7.5, 7.6**

- [ ] 11. Notifications
  - [ ] 11.1 Implement notification creation
    - Create notifications on payroll events
    - Create notifications on low balance
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 11.2 Implement notification UI
    - Create notification bell with badge
    - Create notification dropdown
    - Implement mark as read
    - _Requirements: 8.5_

- [ ] 12. Dashboard Polish
  - [ ] 12.1 Implement dashboard overview
    - Create StatCard components
    - Display treasury balance, upcoming payroll, next date
    - _Requirements: 9.2_

  - [ ] 12.2 Implement error handling and loading states
    - Add loading skeletons
    - Add error toasts with recovery actions
    - _Requirements: 9.4, 9.6_

  - [ ] 12.3 Implement confirmation modals
    - Add confirmation for archive contractor
    - Add confirmation for execute payroll
    - _Requirements: 9.7_

- [ ] 13. Final Checkpoint
  - Ensure all tests pass
  - Verify complete user flow works end-to-end
  - Ask the user if questions arise

## Notes

- All tasks including property-based tests are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
