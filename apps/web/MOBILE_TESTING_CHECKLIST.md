# Mobile Testing Checklist

This checklist covers manual testing requirements for OrbitPayroll on mobile devices per Requirements 8.1-8.6.

## Target Devices

- [ ] iOS Safari (iPhone 12 or newer)
- [ ] Android Chrome (Pixel 5 or newer)
- [ ] iPad Safari (tablet breakpoint)

## Viewport Testing

### Minimum Width (320px)
- [ ] All content visible without horizontal scrolling
- [ ] Text readable without zooming
- [ ] No overlapping elements

### Portrait Orientation
- [ ] Navigation accessible
- [ ] Forms usable
- [ ] Tables scroll horizontally if needed

### Landscape Orientation
- [ ] Layout adapts appropriately
- [ ] No content cut off

## Touch Targets (Requirement 8.3)

All interactive elements must be at least 44x44px:

- [ ] Navigation menu items
- [ ] Buttons (Connect Wallet, Submit, Cancel)
- [ ] Form inputs
- [ ] Table row actions
- [ ] Modal close buttons
- [ ] Dropdown selects

## Responsive Navigation

- [ ] Mobile menu opens/closes correctly
- [ ] Menu items are tappable
- [ ] Current page indicator visible
- [ ] Wallet connection button accessible

## Page-Specific Tests

### Auth Page (`/auth`)
- [ ] Connect wallet button prominent
- [ ] Wallet modal displays correctly
- [ ] Error messages visible

### Dashboard (`/dashboard`)
- [ ] Stat cards stack vertically on mobile
- [ ] Quick actions accessible
- [ ] Recent activity scrollable

### Contractors (`/dashboard/contractors`)
- [ ] Table adapts for mobile (horizontal scroll or card view)
- [ ] Add contractor button visible
- [ ] Edit/Archive actions accessible
- [ ] Form modal fits screen

### Payroll (`/dashboard/payroll`)
- [ ] Preview card readable
- [ ] Contractor list scrollable
- [ ] Execute button prominent
- [ ] Confirmation modal fits screen

### Treasury (`/dashboard/treasury`)
- [ ] Balance card readable
- [ ] Deposit button accessible
- [ ] Transaction history scrollable

## Accessibility on Mobile

- [ ] VoiceOver (iOS) navigation works
- [ ] TalkBack (Android) navigation works
- [ ] Focus indicators visible
- [ ] Form labels announced correctly

## Performance on Mobile

- [ ] Dashboard loads within 3 seconds on 4G
- [ ] No janky scrolling
- [ ] Images load progressively
- [ ] Loading states display quickly

## Browser Zoom (Requirement 7.6)

- [ ] Layout intact at 200% zoom
- [ ] Text remains readable
- [ ] No horizontal scrolling introduced

## Test Results

| Device | OS Version | Browser | Pass/Fail | Notes |
|--------|------------|---------|-----------|-------|
| iPhone | iOS 17 | Safari | | |
| Pixel | Android 14 | Chrome | | |
| iPad | iPadOS 17 | Safari | | |

## Sign-off

- Tester: _______________
- Date: _______________
- Build Version: _______________
