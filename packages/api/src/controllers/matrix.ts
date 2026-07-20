import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/audit';
import { getClientIp } from '../middleware/audit';
import * as matrixService from '../services/matrix';

export async function getPosition(req: AuthRequest, res: Response) {
  const position = await prisma.matrixPosition.findUnique({
    where: { userId: req.user!.id },
    include: { parent: true, children: true },
  });
  return res.json(position || { message: 'No matrix position yet' });
}

export async function getDashboard(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { matrixPosition: true },
  });
  return res.json(user);
}

export async function getTree(req: AuthRequest, res: Response) {
  const tree = await matrixService.getMatrixTree(req.user!.id);
  return res.json(tree || { message: 'No matrix position yet' });
}

export async function getPoolStatus(req: AuthRequest, res: Response) {
  const position = await prisma.matrixPosition.findUnique({
    where: { userId: req.user!.id },
  });
  if (!position) return res.status(404).json({ error: 'No matrix position' });

  return res.json({
    personalPoolCount: position.personalPoolCount,
    poolReserves: position.poolReserves,
    maxPool: 40,
    percentage: (position.personalPoolCount / 40) * 100,
  });
}

export async function retopUp(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const result = await matrixService.handleReTopUp(req.user!.walletAddress);
  if (!result) return res.status(400).json({ error: 'User not found' });

  await prisma.financialTransaction.create({
    data: {
      userId,
      type: 'RETOPUP',
      amount: 40,
      status: 'COMPLETED',
    },
  });

  await logAudit({
    userId,
    action: 'MATRIX_RETOPUP',
    details: { positionId: result.position.id },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json({ success: true, result });
}

export async function requestWithdrawal(req: AuthRequest, res: Response) {
  const { amount } = req.body;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'valid amount required' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || user.matrixBalance < amount) {
    return res.status(400).json({ error: 'Insufficient matrix balance' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      matrixBalance: { decrement: amount },
      withdrawnAmount: { increment: amount },
    },
  });

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId: user.id,
      amount,
      status: 'PENDING',
    },
  });

  await logAudit({
    userId: user.id,
    action: 'WITHDRAWAL_REQUEST',
    details: { amount, withdrawalId: withdrawal.id },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json({ success: true, withdrawal });
}
