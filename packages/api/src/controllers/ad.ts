import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/audit';
import { getClientIp } from '../middleware/audit';

export async function watchAd(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayWatches = await prisma.adWatch.count({
    where: { userId, watchedAt: { gte: today } },
  });
  if (todayWatches >= 1) {
    return res.status(400).json({ error: 'Daily ad already watched' });
  }

  const reward = 3;
  await prisma.adWatch.create({
    data: { userId, reward, ipAddress: req.ip || null },
  });

  const adWallet = await prisma.adWallet.upsert({
    where: { userId },
    update: { lockedBalance: { increment: reward }, lastWatch: new Date() },
    create: { userId, lockedBalance: reward, lastWatch: new Date() },
  });

  await prisma.financialTransaction.create({
    data: {
      userId,
      type: 'AD_REWARD',
      amount: reward,
      status: 'COMPLETED',
      metadata: { ipAddress: req.ip },
    },
  });

  await logAudit({
    userId,
    action: 'AD_WATCH',
    details: { reward, adWalletId: adWallet.id },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json({ reward, adWallet });
}

export async function getBalance(req: AuthRequest, res: Response) {
  const adWallet = await prisma.adWallet.findUnique({ where: { userId: req.user!.id } });
  return res.json(adWallet || { balance: 0, lockedBalance: 0, unlockedBalance: 0 });
}
