import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../db';

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "Withdrawal", "MatrixLevelPayment", "PoolResetLog", "FinancialTransaction", "ContractEvent", "AuditLog", "UserSession", "AdWatch", "AdWallet", "MiningLedger", "NFT", "Airdrop", "MatrixPosition", "User", "SystemConfig" RESTART IDENTITY CASCADE`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
