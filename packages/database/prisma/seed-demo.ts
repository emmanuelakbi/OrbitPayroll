/**
 * Demo Environment Seed Script
 *
 * Creates a realistic demo environment for hackathon judges with:
 * - Demo organization with funded treasury
 * - Multiple contractors with various pay cycles
 * - Historical payroll runs
 * - Sample notifications and events
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import {
  PrismaClient,
  Role,
  PayCycle,
  PayrollStatus,
  ItemStatus,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// Demo wallet addresses (Sepolia testnet)
const DEMO_ADDRESSES = {
  // Admin wallet - this should be the deployer/demo admin
  admin: "0x7d12d3A3de749896e77E7c87F723a3EC4CAbe377",
  // Treasury contract on Sepolia
  treasury: "0xA6f85Ad3CC0E251624F066052172e76e6edF2380",
  // Sample contractor addresses
  contractors: [
    "0xaaa1111111111111111111111111111111111111",
    "0xbbb2222222222222222222222222222222222222",
    "0xccc3333333333333333333333333333333333333",
    "0xddd4444444444444444444444444444444444444",
    "0xeee5555555555555555555555555555555555555",
  ],
};

async function main() {
  console.log("🎬 Starting demo environment seed...\n");

  // Clean existing data (in reverse order of dependencies)
  console.log("🧹 Cleaning existing data...");
  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.orgMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  console.log("   ✓ Database cleaned\n");

  // Create demo admin user
  console.log("👤 Creating demo users...");
  const demoAdmin = await prisma.user.create({
    data: {
      walletAddress: DEMO_ADDRESSES.admin.toLowerCase(),
      email: "admin@orbitpayroll.demo",
    },
  });

  // Create additional demo users for testing multi-user scenarios
  const financeOperator = await prisma.user.create({
    data: {
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      email: "finance@orbitpayroll.demo",
    },
  });

  // Create viewer user for testing multi-user scenarios
  await prisma.user.create({
    data: {
      walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
      email: null,
    },
  });
  console.log("   ✓ Created 3 demo users\n");

  // Create demo organization
  console.log("🏢 Creating demo organization...");
  const demoOrg = await prisma.organization.create({
    data: {
      name: "Orbit Demo Corp",
      treasuryAddress: DEMO_ADDRESSES.treasury.toLowerCase(),
      ownerId: demoAdmin.id,
      members: {
        create: [
          {
            userId: demoAdmin.id,
            role: Role.OWNER_ADMIN,
          },
          {
            userId: financeOperator.id,
            role: Role.FINANCE_OPERATOR,
          },
        ],
      },
    },
  });
  console.log(`   ✓ Created organization: ${demoOrg.name}\n`);

  // Create demo contractors sequentially (avoids Supabase pooler connection limits)
  console.log("👷 Creating demo contractors...");
  const contractorData = [
    {
      name: "Alex Chen - Senior Developer",
      wallet: DEMO_ADDRESSES.contractors[0]!,
      rate: "8500.00000000",
      cycle: PayCycle.MONTHLY,
    },
    {
      name: "Sarah Johnson - UI/UX Designer",
      wallet: DEMO_ADDRESSES.contractors[1]!,
      rate: "6500.00000000",
      cycle: PayCycle.MONTHLY,
    },
    {
      name: "Mike Rodriguez - DevOps Engineer",
      wallet: DEMO_ADDRESSES.contractors[2]!,
      rate: "7500.00000000",
      cycle: PayCycle.BI_WEEKLY,
    },
    {
      name: "Emily Davis - Marketing Specialist",
      wallet: DEMO_ADDRESSES.contractors[3]!,
      rate: "4500.00000000",
      cycle: PayCycle.BI_WEEKLY,
    },
    {
      name: "James Wilson - Content Writer",
      wallet: DEMO_ADDRESSES.contractors[4]!,
      rate: "3000.00000000",
      cycle: PayCycle.WEEKLY,
    },
  ];
  const contractors: any[] = [];
  for (const c of contractorData) {
    const contractor = await prisma.contractor.create({
      data: {
        orgId: demoOrg.id,
        name: c.name,
        walletAddress: c.wallet.toLowerCase(),
        rateAmount: new Decimal(c.rate),
        rateCurrency: "MNEE",
        payCycle: c.cycle,
        active: true,
      },
    });
    contractors.push(contractor);
  }
  console.log(`   ✓ Created ${contractors.length} active contractors\n`);

  // Create historical payroll runs
  console.log("💰 Creating payroll history...");

  // Completed payroll run - December 2025
  const decemberPayroll = await prisma.payrollRun.create({
    data: {
      orgId: demoOrg.id,
      runLabel: "December 2025 Monthly Payroll",
      scheduledDate: new Date("2025-12-01T00:00:00Z"),
      executedAt: new Date("2025-12-01T14:30:00Z"),
      txHash:
        "0xdec2025dec2025dec2025dec2025dec2025dec2025dec2025dec2025dec20251",
      totalMnee: new Decimal("30000.00000000"),
      status: PayrollStatus.EXECUTED,
      items: {
        create: [
          {
            contractorId: contractors[0].id,
            amountMnee: new Decimal("8500.00000000"),
            status: ItemStatus.PAID,
          },
          {
            contractorId: contractors[1].id,
            amountMnee: new Decimal("6500.00000000"),
            status: ItemStatus.PAID,
          },
          {
            contractorId: contractors[2].id,
            amountMnee: new Decimal("7500.00000000"),
            status: ItemStatus.PAID,
          },
          {
            contractorId: contractors[3].id,
            amountMnee: new Decimal("4500.00000000"),
            status: ItemStatus.PAID,
          },
          {
            contractorId: contractors[4].id,
            amountMnee: new Decimal("3000.00000000"),
            status: ItemStatus.PAID,
          },
        ],
      },
    },
  });

  // Completed payroll run - January 2026 (first half)
  const januaryPayroll1 = await prisma.payrollRun.create({
    data: {
      orgId: demoOrg.id,
      runLabel: "January 2026 Bi-Weekly Payroll #1",
      scheduledDate: new Date("2026-01-01T00:00:00Z"),
      executedAt: new Date("2026-01-01T10:15:00Z"),
      txHash:
        "0xjan2026jan2026jan2026jan2026jan2026jan2026jan2026jan2026jan20261",
      totalMnee: new Decimal("15000.00000000"),
      status: PayrollStatus.EXECUTED,
      items: {
        create: [
          {
            contractorId: contractors[0].id,
            amountMnee: new Decimal("8500.00000000"),
            status: ItemStatus.PAID,
          },
          {
            contractorId: contractors[1].id,
            amountMnee: new Decimal("6500.00000000"),
            status: ItemStatus.PAID,
          },
        ],
      },
    },
  });

  // Completed payroll run - January 2026 (second half)
  const januaryPayroll2 = await prisma.payrollRun.create({
    data: {
      orgId: demoOrg.id,
      runLabel: "January 2026 Bi-Weekly Payroll #2",
      scheduledDate: new Date("2026-01-15T00:00:00Z"),
      executedAt: new Date("2026-01-15T09:45:00Z"),
      txHash:
        "0xjan2026jan2026jan2026jan2026jan2026jan2026jan2026jan2026jan20262",
      totalMnee: new Decimal("12000.00000000"),
      status: PayrollStatus.EXECUTED,
      items: {
        create: [
          {
            contractorId: contractors[2].id,
            amountMnee: new Decimal("7500.00000000"),
            status: ItemStatus.PAID,
          },
          {
            contractorId: contractors[3].id,
            amountMnee: new Decimal("4500.00000000"),
            status: ItemStatus.PAID,
          },
        ],
      },
    },
  });

  // Pending payroll run - February 2026
  const februaryPayroll = await prisma.payrollRun.create({
    data: {
      orgId: demoOrg.id,
      runLabel: "February 2026 Monthly Payroll",
      scheduledDate: new Date("2026-02-01T00:00:00Z"),
      executedAt: null,
      txHash: null,
      totalMnee: new Decimal("30000.00000000"),
      status: PayrollStatus.PENDING,
      items: {
        create: [
          {
            contractorId: contractors[0].id,
            amountMnee: new Decimal("8500.00000000"),
            status: ItemStatus.PENDING,
          },
          {
            contractorId: contractors[1].id,
            amountMnee: new Decimal("6500.00000000"),
            status: ItemStatus.PENDING,
          },
          {
            contractorId: contractors[2].id,
            amountMnee: new Decimal("7500.00000000"),
            status: ItemStatus.PENDING,
          },
          {
            contractorId: contractors[3].id,
            amountMnee: new Decimal("4500.00000000"),
            status: ItemStatus.PENDING,
          },
          {
            contractorId: contractors[4].id,
            amountMnee: new Decimal("3000.00000000"),
            status: ItemStatus.PENDING,
          },
        ],
      },
    },
  });
  console.log("   ✓ Created 4 payroll runs (3 executed, 1 pending)\n");

  // Create audit events
  console.log("📝 Creating audit events...");
  await prisma.event.createMany({
    data: [
      {
        orgId: demoOrg.id,
        userId: demoAdmin.id,
        eventType: "ORG_CREATED",
        payload: {
          orgName: "Orbit Demo Corp",
          treasuryAddress: DEMO_ADDRESSES.treasury,
        },
        createdAt: new Date("2025-11-15T10:00:00Z"),
      },
      {
        orgId: demoOrg.id,
        userId: demoAdmin.id,
        eventType: "MEMBER_ADDED",
        payload: {
          memberEmail: "finance@orbitpayroll.demo",
          role: "FINANCE_OPERATOR",
        },
        createdAt: new Date("2025-11-15T10:05:00Z"),
      },
      ...contractors.map((c, i) => ({
        orgId: demoOrg.id,
        userId: demoAdmin.id,
        eventType: "CONTRACTOR_ADDED",
        payload: { contractorName: c.name, walletAddress: c.walletAddress },
        createdAt: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000),
      })),
      {
        orgId: demoOrg.id,
        userId: demoAdmin.id,
        eventType: "PAYROLL_EXECUTED",
        payload: {
          runId: decemberPayroll.id,
          runLabel: "December 2025 Monthly Payroll",
          totalMnee: "30000.00000000",
        },
        createdAt: new Date("2025-12-01T14:30:00Z"),
      },
      {
        orgId: demoOrg.id,
        userId: demoAdmin.id,
        eventType: "PAYROLL_EXECUTED",
        payload: {
          runId: januaryPayroll1.id,
          runLabel: "January 2026 Bi-Weekly Payroll #1",
          totalMnee: "15000.00000000",
        },
        createdAt: new Date("2026-01-01T10:15:00Z"),
      },
      {
        orgId: demoOrg.id,
        userId: financeOperator.id,
        eventType: "PAYROLL_EXECUTED",
        payload: {
          runId: januaryPayroll2.id,
          runLabel: "January 2026 Bi-Weekly Payroll #2",
          totalMnee: "12000.00000000",
        },
        createdAt: new Date("2026-01-15T09:45:00Z"),
      },
      {
        orgId: demoOrg.id,
        userId: demoAdmin.id,
        eventType: "PAYROLL_SCHEDULED",
        payload: {
          runId: februaryPayroll.id,
          runLabel: "February 2026 Monthly Payroll",
          scheduledDate: "2026-02-01",
        },
        createdAt: new Date("2026-01-10T16:00:00Z"),
      },
    ],
  });
  console.log("   ✓ Created audit events\n");

  // Create notifications
  console.log("🔔 Creating notifications...");
  await prisma.notification.createMany({
    data: [
      {
        userId: demoAdmin.id,
        orgId: demoOrg.id,
        type: "PAYROLL_COMPLETE",
        title: "December Payroll Executed",
        message:
          "December 2025 payroll has been executed successfully. Total: 30,000 MNEE distributed to 5 contractors.",
        read: true,
        createdAt: new Date("2025-12-01T14:30:00Z"),
      },
      {
        userId: demoAdmin.id,
        orgId: demoOrg.id,
        type: "PAYROLL_COMPLETE",
        title: "January Payroll #1 Executed",
        message:
          "January 2026 bi-weekly payroll #1 has been executed. Total: 15,000 MNEE.",
        read: true,
        createdAt: new Date("2026-01-01T10:15:00Z"),
      },
      {
        userId: demoAdmin.id,
        orgId: demoOrg.id,
        type: "PAYROLL_COMPLETE",
        title: "January Payroll #2 Executed",
        message:
          "January 2026 bi-weekly payroll #2 has been executed. Total: 12,000 MNEE.",
        read: false,
        createdAt: new Date("2026-01-15T09:45:00Z"),
      },
      {
        userId: demoAdmin.id,
        orgId: demoOrg.id,
        type: "PAYROLL_SCHEDULED",
        title: "February Payroll Scheduled",
        message:
          "February 2026 monthly payroll is scheduled for Feb 1, 2026. Total: 30,000 MNEE.",
        read: false,
        createdAt: new Date("2026-01-10T16:00:00Z"),
      },
      {
        userId: demoAdmin.id,
        orgId: demoOrg.id,
        type: "LOW_BALANCE",
        title: "Treasury Balance Alert",
        message:
          "Your treasury balance is running low. Consider depositing more MNEE before the next payroll.",
        read: false,
        createdAt: new Date("2026-01-12T08:00:00Z"),
      },
      {
        userId: financeOperator.id,
        orgId: demoOrg.id,
        type: "MEMBER_ADDED",
        title: "Welcome to Orbit Demo Corp",
        message:
          "You have been added as a Finance Operator. You can now preview and execute payroll runs.",
        read: true,
        createdAt: new Date("2025-11-15T10:05:00Z"),
      },
    ],
  });
  console.log("   ✓ Created notifications\n");

  // Summary
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log("🎉 Demo environment seed completed successfully!\n");
  console.log("📊 Summary:");
  console.log("   • 3 users (1 admin, 1 finance operator, 1 viewer)");
  console.log("   • 1 organization (Orbit Demo Corp)");
  console.log("   • 5 active contractors");
  console.log("   • 4 payroll runs (3 executed, 1 pending)");
  console.log("   • 12 audit events");
  console.log("   • 6 notifications");
  console.log("");
  console.log("🔑 Demo Admin Wallet:");
  console.log(`   ${DEMO_ADDRESSES.admin}`);
  console.log("");
  console.log("🏦 Treasury Contract (Sepolia):");
  console.log(`   ${DEMO_ADDRESSES.treasury}`);
  console.log("");
  console.log("💡 To fund the treasury with test MNEE:");
  console.log("   1. Get Sepolia ETH from https://sepoliafaucet.com/");
  console.log("   2. Approve MNEE spending on the treasury contract");
  console.log("   3. Call deposit() on the treasury contract");
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
}

main()
  .catch((e) => {
    console.error("❌ Demo seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
