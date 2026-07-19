import { Request, Response } from 'express';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { logAudit } from '../services/audit';
import { getClientIp } from '../middleware/audit';

export async function getNonce(req: Request, res: Response) {
  const { walletAddress } = req.body;
  if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });

  const nonce = `justclickme-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await prisma.user.upsert({
    where: { walletAddress: walletAddress.toLowerCase() },
    update: { nonce },
    create: { walletAddress: walletAddress.toLowerCase(), nonce },
  });
  return res.json({ nonce });
}

export async function login(req: Request, res: Response) {
  const { walletAddress, signature } = req.body;
  if (!walletAddress || !signature) {
    return res.status(400).json({ error: 'walletAddress and signature required' });
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
  if (!user || !user.nonce) return res.status(400).json({ error: 'No nonce found' });

  const recovered = verifyMessage(user.nonce, signature);
  if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const isAdmin = walletAddress.toLowerCase() === (process.env.ADMIN_WALLET || '').toLowerCase();
  const token = jwt.sign(
    { id: user.id, walletAddress: user.walletAddress, isAdmin },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { nonce: null },
  });

  await prisma.userSession.create({
    data: {
      userId: user.id,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    },
  });

  await logAudit({
    userId: user.id,
    action: 'USER_LOGIN',
    details: { walletAddress: user.walletAddress, isAdmin },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json({ token, user: { id: user.id, walletAddress: user.walletAddress, isAdmin } });
}
