import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/audit';
import { getClientIp } from '../middleware/audit';

export async function getPosition(req: AuthRequest, res: Response) {
  const position = await prisma.matrixPosition.findUnique({
    where: { userId: req.user!.id },
  });
  return res.json(position || { message: 'No matrix position yet' });
}

export async function retopUp(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const position = await prisma.matrixPosition.findUnique({ where: { userId } });
  if (!position) return res.status(400).json({ error: 'No active matrix position' });

  const updated = await prisma.matrixPosition.update({
    where: { userId },
    data: { subIds: { push: `sub-${Date.now()}` } },
  });

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
    details: { positionId: updated.id, subIds: updated.subIds },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json({ success: true, position: updated });
}
