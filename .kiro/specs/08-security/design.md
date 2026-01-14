# Design Document: OrbitPayroll Security

## Overview

OrbitPayroll implements defense-in-depth security across authentication, authorization, smart contracts, and data protection. The system follows the principle of non-custodial operation where the backend never holds private keys.

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Security Layers                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 1: Network Security                                              │
│  - HTTPS only, HSTS headers, rate limiting                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 2: Authentication                                                │
│  - SIWE (Sign-In with Ethereum), JWT tokens, session management         │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 3: Authorization                                                 │
│  - Role-based access control, org membership verification               │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 4: Input Validation                                              │
│  - Schema validation (zod), sanitization, parameterized queries         │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 5: Smart Contract Security                                       │
│  - Access control, reentrancy guards, SafeERC20                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Authentication Middleware

```typescript
// middleware/auth.ts
import { verifyJwt } from '../lib/jwt';

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ code: 'AUTH_003', message: 'Token required' });
  }
  
  try {
    const payload = verifyJwt(token);
    req.user = { id: payload.sub, wallet: payload.wallet };
    next();
  } catch (error) {
    return res.status(401).json({ code: 'AUTH_004', message: 'Invalid token' });
  }
}
```

### Authorization Middleware

```typescript
// middleware/authorize.ts
export function requireRole(...roles: Role[]) {
  return async (req, res, next) => {
    const { orgId } = req.params;
    const membership = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: req.user.id } },
    });
    
    if (!membership) {
      return res.status(403).json({ code: 'ORG_002', message: 'Not a member' });
    }
    
    if (!roles.includes(membership.role)) {
      return res.status(403).json({ code: 'ORG_003', message: 'Insufficient permissions' });
    }
    
    req.membership = membership;
    next();
  };
}
```

### Rate Limiting

```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { code: 'RATE_LIMIT', message: 'Too many requests' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { code: 'RATE_LIMIT', message: 'Too many requests' },
});
```

### Security Headers

```typescript
// middleware/security.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'https://*.alchemy.com', 'https://*.infura.io'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
});
```

### Smart Contract Security Patterns

```solidity
// Security patterns in PayrollTreasury

// 1. Access Control
modifier onlyAdmin() {
    require(msg.sender == admin, "Unauthorized");
    _;
}

// 2. Reentrancy Guard (from OpenZeppelin)
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// 3. SafeERC20 for token transfers
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;

// 4. Checks-Effects-Interactions pattern
function emergencyWithdraw(uint256 amount, address recipient) external onlyAdmin nonReentrant {
    // Checks
    require(recipient != address(0), "Invalid recipient");
    require(mneeToken.balanceOf(address(this)) >= amount, "Insufficient balance");
    
    // Effects (none in this case)
    
    // Interactions
    mneeToken.safeTransfer(recipient, amount);
    
    emit EmergencyWithdrawal(msg.sender, recipient, amount);
}
```

## Correctness Properties

### Property 1: Authentication Integrity
*For any* API request to a protected endpoint without a valid JWT, the request SHALL be rejected with 401.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Authorization Enforcement
*For any* action restricted to OWNER_ADMIN, a FINANCE_OPERATOR attempting that action SHALL receive 403.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

### Property 3: Rate Limit Enforcement
*For any* IP exceeding rate limits, subsequent requests SHALL be rejected with 429.

**Validates: Requirements 4.2**

### Property 4: Contract Access Control
*For any* call to runPayroll or emergencyWithdraw from a non-admin address, the transaction SHALL revert.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 5: Reentrancy Protection
*For any* external call during deposit, runPayroll, or emergencyWithdraw, reentrant calls SHALL revert.

**Validates: Requirements 6.1, 6.2**

## Testing Strategy

### Security Test Cases

```typescript
describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should reject requests without token');
    it('should reject expired tokens');
    it('should reject tampered tokens');
  });
  
  describe('Authorization', () => {
    it('should reject non-member access to org');
    it('should reject FINANCE_OPERATOR from admin actions');
    it('should allow OWNER_ADMIN all actions');
  });
  
  describe('Rate Limiting', () => {
    it('should block after 100 auth requests/minute');
    it('should block after 1000 api requests/minute');
  });
  
  describe('Input Validation', () => {
    it('should reject invalid wallet addresses');
    it('should reject SQL injection attempts');
    it('should reject XSS payloads');
  });
});
```

### Contract Security Tests

```solidity
contract SecurityTest is Test {
    function test_RevertWhen_NonAdminCallsRunPayroll() public {
        vm.prank(attacker);
        vm.expectRevert("Unauthorized");
        treasury.runPayroll(recipients, amounts, runId);
    }
    
    function test_RevertWhen_ReentrancyAttempted() public {
        // Deploy malicious contract that attempts reentrancy
        MaliciousContract attacker = new MaliciousContract(treasury);
        vm.expectRevert();
        attacker.attack();
    }
}
```
