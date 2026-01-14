# Design Document: OrbitPayroll Non-Functional Requirements

## Overview

This document defines the implementation approach for cross-cutting concerns including performance, accessibility, usability, and maintainability.

## Performance Optimization

### Database Query Optimization

```typescript
// Eager loading to avoid N+1
const contractors = await prisma.contractor.findMany({
  where: { orgId, active: true },
  include: { payrollItems: { take: 5, orderBy: { createdAt: 'desc' } } },
});

// Pagination
const { data, meta } = await paginate(prisma.contractor, {
  where: { orgId },
  page,
  limit: Math.min(limit, 100),
});
```

### Frontend Performance

```typescript
// React Query caching
const { data } = useQuery({
  queryKey: ['contractors', orgId],
  queryFn: () => api.contractors.list(orgId),
  staleTime: 30_000, // 30 seconds
});

// Optimistic updates
const mutation = useMutation({
  mutationFn: api.contractors.create,
  onMutate: async (newContractor) => {
    await queryClient.cancelQueries(['contractors', orgId]);
    const previous = queryClient.getQueryData(['contractors', orgId]);
    queryClient.setQueryData(['contractors', orgId], (old) => [...old, newContractor]);
    return { previous };
  },
  onError: (err, _, context) => {
    queryClient.setQueryData(['contractors', orgId], context.previous);
  },
});
```

## Accessibility Implementation

```tsx
// Accessible form field
function FormField({ label, error, ...props }) {
  const id = useId();
  const errorId = `${id}-error`;
  
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="mt-1 block w-full rounded-md border-gray-300"
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Focus management
function Modal({ isOpen, onClose, children }) {
  const closeRef = useRef();
  
  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);
  
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <Dialog.Panel>
        <button ref={closeRef} onClick={onClose} aria-label="Close">×</button>
        {children}
      </Dialog.Panel>
    </Dialog>
  );
}
```

## Responsive Design

```css
/* Tailwind breakpoints */
.container {
  @apply px-4 sm:px-6 lg:px-8;
}

.card-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4;
}

/* Touch targets */
.btn {
  @apply min-h-[44px] min-w-[44px] px-4 py-2;
}
```

## Error Messages

```typescript
const errorMessages = {
  AUTH_001: { title: 'Session Expired', action: 'Please reconnect your wallet.' },
  CONT_002: { title: 'Duplicate Wallet', action: 'Use a different wallet address.' },
  PAY_001: { title: 'Insufficient Balance', action: 'Deposit more MNEE to treasury.' },
  NETWORK_ERROR: { title: 'Connection Error', action: 'Check your internet connection.' },
};

function getErrorMessage(code: string): { title: string; action: string } {
  return errorMessages[code] || { title: 'Something went wrong', action: 'Please try again.' };
}
```

## Correctness Properties

### Property 1: Response Time
*For any* dashboard load, the page SHALL render within 2 seconds on 4G connection.

**Validates: Requirements 1.1**

### Property 2: Accessibility Compliance
*For any* interactive element, keyboard navigation and screen reader support SHALL be functional.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**

### Property 3: Responsive Layout
*For any* viewport >= 320px, all content SHALL be accessible without horizontal scrolling.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

## Testing Strategy

- Lighthouse audits for performance and accessibility
- axe-core for automated accessibility testing
- Manual testing on mobile devices
- Load testing with k6 for API endpoints
