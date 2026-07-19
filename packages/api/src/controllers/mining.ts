import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/audit';
import { getClientIp } from '../middleware/audit';

export async function subscribe(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  const ledger = await prisma.miningLedger.upsert({
    where: { userId },
    update: { subscriptionActive: true, subscriptionExpiry: expiry },
    create: { userId, subscriptionActive: true, subscriptionExpiry: expiry },
  });

  await logAudit({
    userId,
    action: 'MINING_SUBSCRIBE',
    details: { expiry },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json({ success: true, ledger });
}

export async function claim(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const ledger = await prisma.miningLedger.findUnique({ where: { userId } });
  if (!ledger || !ledger.subscriptionActive || (ledger.subscriptionExpiry && ledger.subscriptionExpiry < new Date())) {
    return res.status(400).json({ error: 'Active subscription required' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (ledger.lastMineDate && ledger.lastMineDate >= today) {
    return res.status(400).json({ error: 'Already claimed today' });
  }

  const amount = 0.5;
  const updated = await prisma.miningLedger.update({
    where: { userId },
    data: { totalMined: { increment: amount }, dailyMined: amount, lastMineDate: new Date() },
  });

  await prisma.financialTransaction.create({
    data: {
      userId,
      type: 'MINING',
      amount,
      status: 'COMPLETED',
    },
  });

  await logAudit({
    userId,
    action: 'MINING_CLAIM',
    details: { amount },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json({ claimed: amount, ledger: updated });
}

export async function getStatus(req: AuthRequest, res: Response) {
  const ledger = await prisma.miningLedger.findUnique({ where: { userId: req.user!.id } });
  return res.json(ledger || { subscriptionActive: false, totalMined: 0 });
}
