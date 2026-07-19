import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export async function getMe(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { adWallet: true, miningLedger: true, matrixPosition: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
}

export async function getDashboard(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { adWallet: true, miningLedger: true, matrixPosition: true, nfts: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const config = await prisma.systemConfig.findUnique({ where: { id: 'main' } });
  return res.json({ user, config });
}
