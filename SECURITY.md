# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to the maintainers directly
3. Include detailed steps to reproduce the vulnerability

## Security Practices

### Environment Variables

This project uses environment variables for all sensitive configuration:

- **Never commit `.env` files** - they are gitignored
- Use `.env.example` files as templates
- Generate strong secrets: `openssl rand -hex 32`

### Sensitive Data

The following should NEVER be committed:

- Private keys (`DEPLOYER_PRIVATE_KEY`)
- API keys (`ETHERSCAN_API_KEY`, `SENDGRID_API_KEY`)
- JWT secrets (`JWT_SECRET`)
- Database credentials
- RPC URLs with API keys

### Smart Contract Security

The `PayrollTreasury` contract implements:

- **ReentrancyGuard**: Prevents reentrancy attacks
- **SafeERC20**: Safe token transfer handling
- **Access Control**: Role-based admin functions
- **Input Validation**: Array length limits (max 100 recipients)

### Authentication

- **SIWE (Sign-In with Ethereum)**: Passwordless wallet authentication
- **JWT Tokens**: Short-lived access tokens (15 min)
- **Nonce Validation**: Prevents replay attacks

## Audit Status

This is hackathon code and has NOT been professionally audited. Use at your own risk.

## Dependencies

We use well-audited dependencies:

- OpenZeppelin Contracts v5.x
- ethers.js v6
- Prisma ORM with parameterized queries

## License

MIT License - see [LICENSE](LICENSE)
