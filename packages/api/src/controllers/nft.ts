import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/audit';
import { getClientIp } from '../middleware/audit';

export async function getMyNFTs(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const nfts = await prisma.nFT.findMany({ where: { userId } });

  await logAudit({
    userId,
    action: 'NFT_LIST',
    details: { count: nfts.length },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json(nfts);
}
