# OrbitPayroll Demo Video Script

## Overview
- **Target Length**: 4-5 minutes (max 5 minutes)
- **Format**: Screen recording with audio narration
- **Resolution**: 1080p recommended

## Pre-Recording Checklist

### Environment Setup
- [ ] Demo environment deployed and accessible
- [ ] Test wallet connected with testnet ETH for gas
- [ ] Treasury funded with MNEE tokens
- [ ] Demo contractors already added (or ready to add)
- [ ] Browser zoom at 100%, clean browser window
- [ ] Close unnecessary tabs and notifications
- [ ] Disable system notifications

### Recording Tools
- **macOS**: QuickTime Player, OBS Studio, or Loom
- **Audio**: Use external microphone if available
- **Script**: Keep this document visible on second monitor

---

## Video Script

### 0:00 - 0:30 | Problem Statement (30 seconds)

**[Show title slide or landing page]**

> "Managing payroll for distributed teams is complex. Traditional systems require bank accounts in multiple countries, take days to process, and charge high fees for international transfers."
>
> "For Web3 organizations like DAOs and remote-first startups, these legacy systems don't fit their global, borderless nature."

**[Transition to OrbitPayroll landing page]**

---

### 0:30 - 1:00 | Solution Introduction (30 seconds)

**[Show OrbitPayroll homepage]**

> "OrbitPayroll solves this with programmable payroll using MNEE stablecoin."
>
> "MNEE is a dollar-pegged stablecoin that enables instant, low-cost transfers anywhere in the world."
>
> "With OrbitPayroll, organizations can manage contractors, fund a treasury, and execute batch payments - all on-chain, all transparent."

---

### 1:00 - 2:00 | Wallet Connection & Dashboard (60 seconds)

**[Click "Connect Wallet" button]**

> "Let's see it in action. First, I'll connect my wallet using Sign-In with Ethereum."

**[Show MetaMask popup, sign message]**

> "This passwordless authentication means no usernames or passwords to manage - your wallet IS your identity."

**[Show dashboard after login]**

> "Here's the dashboard. We can see our organization overview, treasury balance, and quick access to all features."

**[Point out key UI elements]**

> "The interface shows our MNEE balance, active contractors, and recent payroll activity."

---

### 2:00 - 3:00 | Contractor Management (60 seconds)

**[Navigate to Contractors page]**

> "Let's look at contractor management. Here we have our team members with their wallet addresses and payment rates."

**[Click "Add Contractor" button]**

> "Adding a new contractor is simple - just enter their name, wallet address, and payment details."

**[Fill in form - use example data]**
- Name: "David Chen"
- Wallet: 0x... (paste a test address)
- Rate: 4500 MNEE
- Cycle: Monthly

> "We set their monthly rate in MNEE. The system supports weekly, bi-weekly, and monthly pay cycles."

**[Submit and show new contractor in list]**

> "David is now added and ready for the next payroll run."

---

### 3:00 - 4:00 | Treasury & Payroll Execution (60 seconds)

**[Navigate to Treasury page]**

> "Before running payroll, let's check our treasury. This shows our MNEE balance available for payments."

**[Show treasury balance]**

> "The treasury is a smart contract that holds funds securely. Only authorized admins can execute payments."

**[Navigate to Payroll page]**

> "Now let's run payroll. The system calculates the total amount needed based on contractor rates."

**[Show payroll preview with amounts]**

> "We can see each contractor and their payment amount. The total is calculated automatically."

**[Click "Execute Payroll" button]**

> "When I execute, this creates a single blockchain transaction that pays all contractors in one batch."

**[Show MetaMask transaction confirmation]**

> "I confirm the transaction in my wallet..."

**[Wait for transaction to complete, show success]**

> "And it's done! All contractors paid instantly with a single transaction."

---

### 4:00 - 4:30 | On-Chain Verification (30 seconds)

**[Show transaction hash in UI]**

> "Every payment is fully transparent and verifiable on-chain."

**[Click to view on block explorer - Etherscan/Sepolia]**

> "Here's the transaction on Etherscan. We can see the PayrollExecuted event with all the details - recipients, amounts, and timestamp."

**[Highlight the MNEE token transfers]**

> "Each contractor received their MNEE tokens directly to their wallet. No intermediaries, no delays."

---

### 4:30 - 5:00 | Closing & Impact (30 seconds)

**[Return to dashboard or show summary slide]**

> "OrbitPayroll transforms how distributed teams handle compensation."
>
> "With MNEE integration, organizations get instant settlements, transparent records, and global reach - all without traditional banking infrastructure."
>
> "Whether you're a DAO, a startup, or any remote-first team, OrbitPayroll makes paying your people simple, fast, and borderless."

**[Show links: GitHub, Live Demo, Devpost]**

> "Check out our live demo and source code. Thanks for watching!"

---

## Post-Recording Checklist

### Video Editing
- [ ] Trim any dead air or mistakes
- [ ] Add title card at beginning
- [ ] Add end card with links
- [ ] Verify audio levels are consistent
- [ ] Export at 1080p, H.264 codec

### Upload
- [ ] Upload to YouTube (unlisted or public)
- [ ] Add title: "OrbitPayroll - Web3 Payroll with MNEE | Demo"
- [ ] Add description with links
- [ ] Add relevant tags: Web3, Payroll, MNEE, Ethereum, DeFi
- [ ] Copy video URL

### Link Video
- [ ] Add video link to README.md
- [ ] Add video link to Devpost submission
- [ ] Test that links work

---

## Tips for Recording

1. **Practice the flow** 2-3 times before recording
2. **Speak slowly and clearly** - you can always speed up in editing
3. **Pause between sections** - easier to edit
4. **If you make a mistake**, pause, then restart that section
5. **Keep mouse movements smooth** and deliberate
6. **Highlight clicks** with cursor effects if your tool supports it

## Backup Plan

If the live demo has issues during recording:
- Have screenshots ready as fallback
- Pre-record individual sections and splice together
- Use a local development environment as backup
