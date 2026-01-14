# Requirements Document: OrbitPayroll Frontend

## Introduction

This document specifies the frontend requirements for OrbitPayroll, defining the user interface, pages, components, and interactions that enable users to manage contractors and execute payroll through a Web3-enabled dashboard.

## Glossary

- **Web_App**: Next.js/React single-page application
- **Dashboard**: Main authenticated view showing organization overview
- **Wallet_Connect**: Component enabling Ethereum wallet connection (MetaMask, WalletConnect, etc.)
- **Treasury_Card**: UI component displaying MNEE balance and funding status
- **Contractor_Table**: UI component listing contractors with management actions
- **Payroll_Preview**: UI component showing calculated payments before execution
- **Transaction_Modal**: UI component for confirming and tracking blockchain transactions
- **Toast**: Notification component for success/error messages
- **Loading_State**: Visual indicator during async operations

## Requirements

### Requirement 1: Landing Page

**User Story:** As a visitor, I want to understand OrbitPayroll's value proposition, so that I can decide to use the platform.

#### Acceptance Criteria

1. WHEN a visitor loads the landing page THEN the Web_App SHALL display product pitch highlighting MNEE-native payroll
2. THE Web_App SHALL display a prominent "Connect Wallet" or "Get Started" call-to-action
3. THE Web_App SHALL display key features: contractor management, batch payments, treasury control
4. THE Web_App SHALL display hackathon context and MNEE integration benefits
5. THE Web_App SHALL load and render within 3 seconds on average connection
6. THE Web_App SHALL be fully responsive on mobile devices

### Requirement 2: Wallet Connection

**User Story:** As a user, I want to connect my wallet easily, so that I can authenticate and access the platform.

#### Acceptance Criteria

1. WHEN a user clicks connect wallet THEN the Web_App SHALL display supported wallet options
2. THE Web_App SHALL support MetaMask, WalletConnect, and Coinbase Wallet at minimum
3. WHEN wallet connects THEN the Web_App SHALL request signature for authentication
4. WHILE signature is pending THEN the Web_App SHALL display signing prompt with clear instructions
5. IF user rejects signature THEN the Web_App SHALL display friendly message and allow retry
6. WHEN authentication succeeds THEN the Web_App SHALL redirect to dashboard
7. THE Web_App SHALL display connected wallet address (truncated) in header when authenticated
8. WHEN user clicks disconnect THEN the Web_App SHALL clear session and return to landing

### Requirement 3: Dashboard Overview

**User Story:** As an authenticated user, I want a clear dashboard overview, so that I can quickly assess my organization's payroll status.

#### Acceptance Criteria

1. WHEN dashboard loads THEN the Web_App SHALL display within 2 seconds on average connection
2. THE Web_App SHALL display Treasury_Card showing current MNEE balance
3. THE Web_App SHALL display upcoming payroll total card
4. THE Web_App SHALL display next payroll date card (if scheduled)
5. THE Web_App SHALL display recent activity feed (last 5 events)
6. IF user belongs to multiple organizations THEN the Web_App SHALL provide organization switcher
7. WHILE data is loading THEN the Web_App SHALL display skeleton loading states
8. IF API request fails THEN the Web_App SHALL display error state with retry option

### Requirement 4: Contractor Management Page

**User Story:** As an organization admin, I want to manage contractors through the UI, so that I can maintain an accurate payroll roster.

#### Acceptance Criteria

1. WHEN viewing contractors page THEN the Web_App SHALL display Contractor_Table with all contractors
2. THE Contractor_Table SHALL display: name, wallet (truncated), rate, pay cycle, status
3. THE Web_App SHALL provide search input to filter contractors by name or wallet
4. THE Web_App SHALL provide pagination for large contractor lists (20 per page)
5. WHEN admin clicks "Add Contractor" THEN the Web_App SHALL display contractor form modal
6. THE contractor form SHALL validate wallet address format before submission
7. THE contractor form SHALL validate rate is positive number
8. WHEN admin clicks edit on a contractor THEN the Web_App SHALL display pre-filled form modal
9. WHEN admin clicks archive THEN the Web_App SHALL display confirmation modal
10. IF user is Finance_Operator THEN the Web_App SHALL hide add/edit/archive actions

### Requirement 5: Treasury Page

**User Story:** As an organization admin, I want to view and fund the treasury, so that I can ensure sufficient balance for payroll.

#### Acceptance Criteria

1. WHEN viewing treasury page THEN the Web_App SHALL display current MNEE balance prominently
2. THE Web_App SHALL display treasury contract address with copy button
3. THE Web_App SHALL display upcoming payroll total and balance comparison
4. IF balance is insufficient THEN the Web_App SHALL display warning with deficit amount
5. WHEN admin clicks "Deposit MNEE" THEN the Web_App SHALL display deposit flow
6. THE deposit flow SHALL request MNEE approval if allowance is insufficient
7. THE deposit flow SHALL display Transaction_Modal during approval and transfer
8. WHEN deposit confirms THEN the Web_App SHALL update balance and show success Toast
9. THE Web_App SHALL display transaction history with dates, amounts, and tx hash links

### Requirement 6: Payroll Execution Flow

**User Story:** As a finance operator, I want to preview and execute payroll, so that contractors receive accurate payments.

#### Acceptance Criteria

1. WHEN user navigates to payroll page THEN the Web_App SHALL display Payroll_Preview
2. THE Payroll_Preview SHALL list each active contractor with calculated MNEE amount
3. THE Payroll_Preview SHALL display total MNEE required
4. THE Payroll_Preview SHALL display current treasury balance for comparison
5. IF treasury balance is insufficient THEN the Web_App SHALL disable execute button with explanation
6. WHEN user clicks "Execute Payroll" THEN the Web_App SHALL display confirmation modal
7. THE confirmation modal SHALL display gas estimate for the transaction
8. WHEN user confirms THEN the Web_App SHALL submit transaction to PayrollManager contract
9. WHILE transaction is pending THEN the Web_App SHALL display Transaction_Modal with status
10. WHEN transaction confirms THEN the Web_App SHALL post run to backend and show success
11. IF transaction fails THEN the Web_App SHALL display error details and allow retry

### Requirement 7: Payroll History Page

**User Story:** As an organization member, I want to view payroll history, so that I can audit past payments.

#### Acceptance Criteria

1. WHEN viewing history page THEN the Web_App SHALL display list of past payroll runs
2. THE list SHALL display: date, total MNEE, contractor count, status, tx hash link
3. THE Web_App SHALL provide pagination for history (20 per page)
4. WHEN user clicks a payroll run THEN the Web_App SHALL display run details
5. THE run details SHALL list each contractor payment with amount
6. THE Web_App SHALL provide "View on Etherscan" link for transaction
7. THE Web_App SHALL provide CSV export button for payroll data

### Requirement 8: Notifications

**User Story:** As a user, I want to see notifications, so that I stay informed about payroll events.

#### Acceptance Criteria

1. THE Web_App SHALL display notification bell icon in header
2. THE notification bell SHALL display unread count badge
3. WHEN user clicks bell THEN the Web_App SHALL display notification dropdown
4. THE dropdown SHALL list recent notifications with type, message, and timestamp
5. WHEN user clicks a notification THEN the Web_App SHALL mark as read and navigate if applicable
6. THE Web_App SHALL provide "Mark all as read" action

### Requirement 9: Error Handling and UX

**User Story:** As a user, I want clear feedback on errors, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN an API error occurs THEN the Web_App SHALL display descriptive Toast with error message
2. THE Web_App SHALL use human-readable language avoiding technical jargon
3. WHEN a transaction fails THEN the Web_App SHALL display specific failure reason if available
4. THE Web_App SHALL provide suggested actions for common errors (insufficient funds, rejected signature)
5. WHEN network is unavailable THEN the Web_App SHALL display offline indicator
6. THE Web_App SHALL implement optimistic updates with rollback on failure
7. WHEN performing destructive actions THEN the Web_App SHALL require confirmation modal

### Requirement 10: Responsive Design

**User Story:** As a mobile user, I want to access OrbitPayroll on my phone, so that I can manage payroll on the go.

#### Acceptance Criteria

1. THE Web_App SHALL be fully functional on screens 320px and wider
2. THE Web_App SHALL use responsive navigation (hamburger menu on mobile)
3. THE Contractor_Table SHALL adapt to card layout on mobile
4. THE Web_App SHALL ensure touch targets are minimum 44px
5. THE Web_App SHALL maintain readability with appropriate font sizes
6. THE Web_App SHALL test and function on iOS Safari and Android Chrome

### Requirement 11: Development and Testing Support

**User Story:** As a developer, I want testing utilities, so that I can develop and debug efficiently.

#### Acceptance Criteria

1. THE Web_App SHALL support feature flag to toggle between mock and real contracts
2. THE Web_App SHALL provide React Query devtools in development mode
3. THE Web_App SHALL log API calls and responses in development console
4. THE Web_App SHALL support testnet configuration via environment variables
5. THE Web_App SHALL display current network name in header during development
