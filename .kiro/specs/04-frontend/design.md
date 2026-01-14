# Design Document: OrbitPayroll Frontend

## Overview

The OrbitPayroll frontend is a Next.js 14 application providing a responsive dashboard for managing contractors and executing payroll. It integrates with Ethereum wallets for authentication and transaction signing, while communicating with the backend API for data persistence.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Next.js App                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                            App Router (app/)                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Landing │ │  Auth   │ │Dashboard│ │Contractors│ │ Payroll │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────────────────┤
│                          Component Layer                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │   Layout    │ │    Cards    │ │   Tables    │ │   Modals    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
├─────────────────────────────────────────────────────────────────────────┤
│                           State Layer                                    │
│  ┌─────────────────────┐ ┌─────────────────────┐                        │
│  │   TanStack Query    │ │    Zustand Store    │                        │
│  │   (Server State)    │ │   (Client State)    │                        │
│  └─────────────────────┘ └─────────────────────┘                        │
├─────────────────────────────────────────────────────────────────────────┤
│                         Integration Layer                                │
│  ┌─────────────────────┐ ┌─────────────────────┐                        │
│  │    API Client       │ │   wagmi + viem      │                        │
│  │   (REST calls)      │ │  (Web3 + Wallets)   │                        │
│  └─────────────────────┘ └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Page Structure

```
app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Landing page
├── auth/
│   └── page.tsx            # Wallet connection page
├── dashboard/
│   ├── layout.tsx          # Dashboard layout with sidebar
│   ├── page.tsx            # Dashboard overview
│   ├── contractors/
│   │   └── page.tsx        # Contractor management
│   ├── treasury/
│   │   └── page.tsx        # Treasury view
│   ├── payroll/
│   │   └── page.tsx        # Payroll execution
│   └── history/
│       └── page.tsx        # Payroll history
└── providers.tsx           # Client providers wrapper
```

### Core Components

```typescript
// Layout Components
interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface SidebarProps {
  currentOrg: Organization | null;
  onOrgChange: (orgId: string) => void;
}

interface HeaderProps {
  user: User | null;
  onDisconnect: () => void;
}

// Card Components
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

interface TreasuryCardProps {
  balance: bigint;
  upcomingPayroll: bigint;
  isSufficient: boolean;
  onDeposit: () => void;
}

// Table Components
interface ContractorTableProps {
  contractors: Contractor[];
  isLoading: boolean;
  onEdit: (contractor: Contractor) => void;
  onArchive: (contractorId: string) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
}

interface PayrollHistoryTableProps {
  runs: PayrollRun[];
  isLoading: boolean;
  onViewDetails: (runId: string) => void;
}

// Modal Components
interface ContractorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor?: Contractor;  // undefined for create
  onSubmit: (data: ContractorInput) => Promise<void>;
}

interface PayrollConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: PayrollPreview;
  gasEstimate: bigint;
  onConfirm: () => void;
  isExecuting: boolean;
}

interface TransactionModalProps {
  isOpen: boolean;
  status: 'pending' | 'confirming' | 'success' | 'error';
  txHash?: string;
  error?: string;
  onClose: () => void;
}
```

### State Management

```typescript
// Zustand store for client state
interface AppStore {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Org state
  currentOrgId: string | null;
  setCurrentOrgId: (orgId: string) => void;
  
  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Notifications
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

// TanStack Query keys
const queryKeys = {
  user: ['user'] as const,
  orgs: ['orgs'] as const,
  org: (id: string) => ['org', id] as const,
  contractors: (orgId: string, params?: ListParams) => 
    ['contractors', orgId, params] as const,
  treasury: (orgId: string) => ['treasury', orgId] as const,
  payrollPreview: (orgId: string) => ['payroll-preview', orgId] as const,
  payrollRuns: (orgId: string, params?: ListParams) => 
    ['payroll-runs', orgId, params] as const,
  notifications: (params?: ListParams) => ['notifications', params] as const,
};
```

### API Client

```typescript
// Base API client
class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;
  
  async request<T>(
    method: string,
    path: string,
    options?: RequestOptions
  ): Promise<T>;
  
  // Auth endpoints
  auth = {
    getNonce: (wallet: string) => this.request<NonceResponse>('POST', '/auth/nonce', { body: { walletAddress: wallet } }),
    verify: (data: VerifyRequest) => this.request<VerifyResponse>('POST', '/auth/verify', { body: data }),
    refresh: (token: string) => this.request<RefreshResponse>('POST', '/auth/refresh', { body: { refreshToken: token } }),
    logout: () => this.request<void>('POST', '/auth/logout'),
  };
  
  // Org endpoints
  orgs = {
    list: () => this.request<ListOrgsResponse>('GET', '/orgs'),
    get: (id: string) => this.request<OrgResponse>('GET', `/orgs/${id}`),
    create: (data: CreateOrgRequest) => this.request<OrgResponse>('POST', '/orgs', { body: data }),
    update: (id: string, data: UpdateOrgRequest) => this.request<OrgResponse>('PUT', `/orgs/${id}`, { body: data }),
  };
  
  // Contractor endpoints
  contractors = {
    list: (orgId: string, params?: ListParams) => 
      this.request<PaginatedResponse<Contractor>>('GET', `/orgs/${orgId}/contractors`, { params }),
    get: (orgId: string, id: string) => 
      this.request<Contractor>('GET', `/orgs/${orgId}/contractors/${id}`),
    create: (orgId: string, data: ContractorInput) => 
      this.request<Contractor>('POST', `/orgs/${orgId}/contractors`, { body: data }),
    update: (orgId: string, id: string, data: Partial<ContractorInput>) => 
      this.request<Contractor>('PUT', `/orgs/${orgId}/contractors/${id}`, { body: data }),
    archive: (orgId: string, id: string) => 
      this.request<void>('DELETE', `/orgs/${orgId}/contractors/${id}`),
  };
  
  // Payroll endpoints
  payroll = {
    preview: (orgId: string) => 
      this.request<PayrollPreview>('POST', `/orgs/${orgId}/payroll-runs/preview`),
    create: (orgId: string, data: CreatePayrollRunRequest) => 
      this.request<PayrollRun>('POST', `/orgs/${orgId}/payroll-runs`, { body: data }),
    list: (orgId: string, params?: ListParams) => 
      this.request<PaginatedResponse<PayrollRun>>('GET', `/orgs/${orgId}/payroll-runs`, { params }),
    get: (orgId: string, id: string) => 
      this.request<PayrollRunDetail>('GET', `/orgs/${orgId}/payroll-runs/${id}`),
  };
  
  // Treasury endpoints
  treasury = {
    get: (orgId: string) => this.request<TreasuryResponse>('GET', `/orgs/${orgId}/treasury`),
  };
}
```

### Web3 Integration

```typescript
// wagmi config
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID }),
    coinbaseWallet({ appName: 'OrbitPayroll' }),
  ],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  },
});

// Contract hooks
function useTreasuryBalance(treasuryAddress: string) {
  return useReadContract({
    address: MNEE_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [treasuryAddress],
  });
}

function useDepositMnee(treasuryAddress: string) {
  const { writeContractAsync } = useWriteContract();
  
  return useMutation({
    mutationFn: async (amount: bigint) => {
      // First approve
      await writeContractAsync({
        address: MNEE_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [treasuryAddress, amount],
      });
      
      // Then deposit
      return writeContractAsync({
        address: treasuryAddress,
        abi: TREASURY_ABI,
        functionName: 'deposit',
        args: [amount],
      });
    },
  });
}

function useRunPayroll(treasuryAddress: string) {
  const { writeContractAsync } = useWriteContract();
  
  return useMutation({
    mutationFn: async (params: {
      recipients: string[];
      amounts: bigint[];
      runId: string;
    }) => {
      return writeContractAsync({
        address: treasuryAddress,
        abi: TREASURY_ABI,
        functionName: 'runPayroll',
        args: [params.recipients, params.amounts, params.runId],
      });
    },
  });
}
```

## Data Models

### UI State Types

```typescript
// Form state
interface ContractorFormState {
  name: string;
  walletAddress: string;
  rateAmount: string;
  rateCurrency: string;
  payCycle: PayCycle;
  errors: Record<string, string>;
}

// Pagination state
interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Transaction state
type TransactionStatus = 
  | { status: 'idle' }
  | { status: 'pending'; message: string }
  | { status: 'confirming'; txHash: string }
  | { status: 'success'; txHash: string }
  | { status: 'error'; error: string };

// Toast state
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
```

### Display Formatters

```typescript
// Format wallet address for display
function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format MNEE amount (18 decimals)
function formatMnee(amount: bigint): string {
  const formatted = formatUnits(amount, 18);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(formatted));
}

// Format date
function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

// Get explorer URL
function getExplorerUrl(txHash: string, network: 'mainnet' | 'sepolia'): string {
  const base = network === 'mainnet' 
    ? 'https://etherscan.io' 
    : 'https://sepolia.etherscan.io';
  return `${base}/tx/${txHash}`;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Wallet Connection State Consistency

*For any* wallet connection state change, the UI SHALL reflect the correct authentication status, AND disconnecting SHALL clear all user-specific data from the UI.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

### Property 2: Form Validation Feedback

*For any* form input that violates validation rules, the UI SHALL display an inline error message near the relevant field within 100ms of the validation trigger.

**Validates: Requirements 4.6, 4.7**

### Property 3: Loading State Display

*For any* async operation (API call, transaction), the UI SHALL display a loading indicator within 100ms of operation start AND remove it when the operation completes.

**Validates: Requirements 3.7, 9.6**

### Property 4: Error Message Clarity

*For any* error condition, the UI SHALL display a human-readable message without technical jargon AND provide a suggested recovery action where applicable.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 5: Payroll Preview Accuracy

*For any* payroll preview display, the total shown SHALL equal the sum of individual contractor amounts displayed.

**Validates: Requirements 6.2, 6.3**

### Property 6: Insufficient Balance Warning

*For any* payroll preview where treasury balance is less than total required, the UI SHALL display a warning with the deficit amount AND disable the execute button.

**Validates: Requirements 6.4, 6.5**

### Property 7: Transaction Status Tracking

*For any* blockchain transaction initiated, the UI SHALL display the current status (pending, confirming, success, error) AND provide the transaction hash when available.

**Validates: Requirements 6.8, 6.9, 6.10, 6.11**

### Property 8: Confirmation Modal Requirement

*For any* destructive action (archive contractor, execute payroll), the UI SHALL display a confirmation modal before proceeding.

**Validates: Requirements 4.9, 6.6, 6.7**

### Property 9: Responsive Layout Integrity

*For any* viewport width >= 320px, all interactive elements SHALL be accessible and functional, AND touch targets SHALL be minimum 44px.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

### Property 10: Pagination Correctness

*For any* paginated list, navigating to page N SHALL display items (N-1)*limit to N*limit, AND the current page indicator SHALL match the displayed data.

**Validates: Requirements 4.4, 7.3**

## Error Handling

### Error Display Patterns

```typescript
// Toast notifications for transient errors
function showErrorToast(error: ApiError) {
  const message = getHumanReadableError(error);
  toast.error(message.title, { description: message.description });
}

// Inline errors for form validation
function FormField({ error, ...props }) {
  return (
    <div>
      <Input {...props} className={error ? 'border-red-500' : ''} />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// Full-page error for critical failures
function ErrorPage({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

### Error Message Mapping

```typescript
const errorMessages: Record<string, { title: string; description: string }> = {
  AUTH_001: {
    title: 'Session Expired',
    description: 'Please reconnect your wallet to continue.',
  },
  AUTH_002: {
    title: 'Signature Failed',
    description: 'We couldn\'t verify your signature. Please try again.',
  },
  CONT_002: {
    title: 'Duplicate Wallet',
    description: 'A contractor with this wallet address already exists.',
  },
  PAY_001: {
    title: 'Insufficient Balance',
    description: 'Your treasury doesn\'t have enough MNEE. Please deposit more funds.',
  },
  NETWORK_ERROR: {
    title: 'Connection Error',
    description: 'Unable to reach the server. Please check your internet connection.',
  },
  TX_REJECTED: {
    title: 'Transaction Rejected',
    description: 'You rejected the transaction in your wallet.',
  },
  TX_FAILED: {
    title: 'Transaction Failed',
    description: 'The transaction failed on-chain. Please try again.',
  },
};
```

## Testing Strategy

### Component Tests

```typescript
describe('ContractorTable', () => {
  it('should render contractor list');
  it('should display loading skeleton when loading');
  it('should handle empty state');
  it('should call onEdit when edit button clicked');
  it('should call onArchive when archive confirmed');
  it('should paginate correctly');
});

describe('PayrollPreview', () => {
  it('should display all contractors with amounts');
  it('should show correct total');
  it('should show warning when insufficient balance');
  it('should disable execute when insufficient');
});

describe('TransactionModal', () => {
  it('should show pending state');
  it('should show confirming state with tx hash');
  it('should show success state');
  it('should show error state with message');
});
```

### Integration Tests

```typescript
describe('Auth Flow', () => {
  it('should complete wallet connection flow');
  it('should redirect to dashboard after auth');
  it('should handle signature rejection');
  it('should clear state on disconnect');
});

describe('Payroll Flow', () => {
  it('should load preview with contractors');
  it('should execute payroll transaction');
  it('should record run after confirmation');
  it('should show in history after completion');
});
```

### E2E Tests (Playwright)

```typescript
test.describe('OrbitPayroll E2E', () => {
  test('complete onboarding flow', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Connect Wallet');
    // ... wallet connection steps
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('add contractor and run payroll', async ({ page }) => {
    // Login
    await loginWithWallet(page);
    
    // Add contractor
    await page.click('text=Contractors');
    await page.click('text=Add Contractor');
    await page.fill('[name=name]', 'Test Contractor');
    await page.fill('[name=walletAddress]', '0x...');
    await page.fill('[name=rateAmount]', '1000');
    await page.click('text=Save');
    
    // Run payroll
    await page.click('text=Payroll');
    await page.click('text=Execute Payroll');
    await page.click('text=Confirm');
    // ... transaction confirmation
    
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```
