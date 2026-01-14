/**
 * Fund Demo Treasury Script
 * 
 * This script helps fund the demo treasury with test MNEE tokens on Sepolia.
 * 
 * Prerequisites:
 * - Sepolia ETH in the deployer wallet for gas
 * - MNEE tokens in the deployer wallet (or use MockMNEE)
 * 
 * Usage:
 *   npx ts-node scripts/fund-demo-treasury.ts
 * 
 * Environment variables:
 *   DEPLOYER_PRIVATE_KEY - Private key of the wallet with MNEE
 *   SEPOLIA_RPC_URL - Sepolia RPC endpoint
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment from contracts package
dotenv.config({ path: path.join(__dirname, '../packages/contracts/.env') });

// Contract addresses on Sepolia
const ADDRESSES = {
  treasury: '0xA6f85Ad3CC0E251624F066052172e76e6edF2380',
  mnee: '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF',
};

// Minimal ABIs for the operations we need
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

const TREASURY_ABI = [
  'function deposit(uint256 amount) external',
  'function getBalance() view returns (uint256)',
  'function admin() view returns (address)',
];

async function main() {
  console.log('🏦 Demo Treasury Funding Script\n');

  // Validate environment
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  if (!privateKey) {
    console.error('❌ DEPLOYER_PRIVATE_KEY not set in environment');
    console.log('   Set it in packages/contracts/.env');
    process.exit(1);
  }

  if (!rpcUrl) {
    console.error('❌ SEPOLIA_RPC_URL not set in environment');
    console.log('   Set it in packages/contracts/.env');
    process.exit(1);
  }

  // Connect to Sepolia
  console.log('📡 Connecting to Sepolia...');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`   Wallet: ${wallet.address}`);
  
  // Check ETH balance
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`   ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
  
  if (ethBalance === 0n) {
    console.error('\n❌ No ETH for gas! Get Sepolia ETH from:');
    console.log('   https://sepoliafaucet.com/');
    process.exit(1);
  }

  // Connect to contracts
  const mnee = new ethers.Contract(ADDRESSES.mnee, ERC20_ABI, wallet);
  const treasury = new ethers.Contract(ADDRESSES.treasury, TREASURY_ABI, wallet);

  // Get token info
  const decimals = await mnee.decimals();
  const symbol = await mnee.symbol();
  console.log(`\n💰 Token: ${symbol} (${decimals} decimals)`);

  // Check MNEE balance
  const mneeBalance = await mnee.balanceOf(wallet.address);
  console.log(`   Your ${symbol} Balance: ${ethers.formatUnits(mneeBalance, decimals)}`);

  // Check treasury balance
  const treasuryBalance = await treasury.getBalance();
  console.log(`   Treasury Balance: ${ethers.formatUnits(treasuryBalance, decimals)} ${symbol}`);

  // Amount to deposit (50,000 MNEE for demo)
  const depositAmount = ethers.parseUnits('50000', decimals);
  
  if (mneeBalance < depositAmount) {
    console.error(`\n❌ Insufficient ${symbol} balance!`);
    console.log(`   Need: ${ethers.formatUnits(depositAmount, decimals)} ${symbol}`);
    console.log(`   Have: ${ethers.formatUnits(mneeBalance, decimals)} ${symbol}`);
    console.log('\n   Options:');
    console.log('   1. Get test MNEE tokens');
    console.log('   2. Deploy MockMNEE and mint tokens');
    process.exit(1);
  }

  // Check allowance
  const allowance = await mnee.allowance(wallet.address, ADDRESSES.treasury);
  console.log(`\n📋 Current Allowance: ${ethers.formatUnits(allowance, decimals)} ${symbol}`);

  if (allowance < depositAmount) {
    console.log('\n🔐 Approving treasury to spend MNEE...');
    const approveTx = await mnee.approve(ADDRESSES.treasury, depositAmount);
    console.log(`   Transaction: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('   ✓ Approved!');
  }

  // Deposit to treasury
  console.log('\n💸 Depositing to treasury...');
  const depositTx = await treasury.deposit(depositAmount);
  console.log(`   Transaction: ${depositTx.hash}`);
  await depositTx.wait();
  console.log('   ✓ Deposited!');

  // Verify new balance
  const newTreasuryBalance = await treasury.getBalance();
  console.log(`\n✅ Treasury funded successfully!`);
  console.log(`   New Treasury Balance: ${ethers.formatUnits(newTreasuryBalance, decimals)} ${symbol}`);
  console.log(`\n   View on Etherscan:`);
  console.log(`   https://sepolia.etherscan.io/address/${ADDRESSES.treasury}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
