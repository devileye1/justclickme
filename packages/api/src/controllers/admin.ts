import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/audit';
import { getClientIp } from '../middleware/audit';

function parsePagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export async function getStats(req: AuthRequest, res: Response) {
  const [
    users,
    adWatches,
    totalMined,
    transactions,
    sessions,
    events,
    suspended,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.adWatch.count(),
    prisma.miningLedger.aggregate({ _sum: { totalMined: true } }),
    prisma.financialTransaction.count(),
    prisma.userSession.count(),
    prisma.contractEvent.count(),
    prisma.user.count({ where: { isSuspended: true } }),
  ]);

  return res.json({
    users,
    adWatches,
    totalMined: totalMined._sum.totalMined || 0,
    transactions,
    sessions,
    events,
    suspended,
  });
}

export async function listUsers(req: AuthRequest, res: Response) {
  const { page, limit, skip } = parsePagination(req);
  const search = (req.query.search as string)?.toLowerCase();
  const where = search
    ? {
        OR: [
          { walletAddress: { contains: search } },
          { email: { contains: search } },
          { username: { contains: search } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { adWallet: true, miningLedger: true, matrixPosition: true },
    }),
    prisma.user.count({ where }),
  ]);

  return res.json({ data: users, total, page, limit });
}

export async function getUserDetail(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      adWallet: true,
      miningLedger: true,
      matrixPosition: true,
      nfts: true,
      airdrops: true,
      adWatches: { orderBy: { watchedAt: 'desc' }, take: 50 },
      sessions: { orderBy: { loginAt: 'desc' }, take: 20 },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
      transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      referrals: { select: { id: true, walletAddress: true, createdAt: true } },
    },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
}

export async function suspendUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { reason, suspend } = req.body;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const user = await prisma.user.update({
    where: { id },
    data: { isSuspended: suspend ?? true },
  });

  await logAudit({
    userId: req.user!.id,
    targetId: id,
    action: 'ADMIN_SUSPEND_USER',
    details: { suspended: suspend ?? true, reason },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json({ success: true, user });
}

export async function adjustBalance(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { amount, type, reason } = req.body;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !type) {
    return res.status(400).json({ error: 'valid amount and type required' });
  }

  const validTypes = ['AD_WALLET', 'MINING', 'RETOPUP', 'ADMIN_ADJUSTMENT'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of ${validTypes.join(', ')}` });
  }

  const adWallet = await prisma.adWallet.upsert({
    where: { userId: id },
    update: { balance: { increment: amount } },
    create: { userId: id, balance: amount },
  });

  const tx = await prisma.financialTransaction.create({
    data: {
      userId: id,
      type,
      amount,
      status: 'COMPLETED',
      metadata: { reason, adjustedBy: req.user!.id },
    },
  });

  await logAudit({
    userId: req.user!.id,
    targetId: id,
    action: 'ADMIN_ADJUST_BALANCE',
    details: { amount, type, reason, transactionId: tx.id },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json({ success: true, adWallet, transaction: tx });
}

export async function listAuditLogs(req: AuthRequest, res: Response) {
  const { page, limit, skip } = parsePagination(req);
  const action = req.query.action as string | undefined;
  const userId = req.query.userId as string | undefined;
  const where = { ...(action ? { action } : {}), ...(userId ? { userId } : {}) };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return res.json({ data, total, page, limit });
}

export async function listSessions(req: AuthRequest, res: Response) {
  const { page, limit, skip } = parsePagination(req);
  const userId = req.query.userId as string | undefined;
  const where = userId ? { userId } : {};

  const [data, total] = await Promise.all([
    prisma.userSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: { loginAt: 'desc' },
      include: { user: { select: { walletAddress: true } } },
    }),
    prisma.userSession.count({ where }),
  ]);

  return res.json({ data, total, page, limit });
}

export async function listContractEvents(req: AuthRequest, res: Response) {
  const { page, limit, skip } = parsePagination(req);
  const eventName = req.query.eventName as string | undefined;
  const walletAddress = req.query.wallet as string | undefined;
  const where = {
    ...(eventName ? { eventName } : {}),
    ...(walletAddress ? { walletAddress: { contains: walletAddress.toLowerCase() } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.contractEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { blockNumber: 'desc' },
    }),
    prisma.contractEvent.count({ where }),
  ]);

  return res.json({ data, total, page, limit });
}

export async function listFinancialTransactions(req: AuthRequest, res: Response) {
  const { page, limit, skip } = parsePagination(req);
  const type = req.query.type as string | undefined;
  const userId = req.query.userId as string | undefined;
  const where = { ...(type ? { type } : {}), ...(userId ? { userId } : {}) };

  const [data, total] = await Promise.all([
    prisma.financialTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { walletAddress: true } } },
    }),
    prisma.financialTransaction.count({ where }),
  ]);

  return res.json({ data, total, page, limit });
}

export async function getAnalytics(req: AuthRequest, res: Response) {
  const days = Math.max(1, parseInt(req.query.days as string, 10) || 30);

  const [signups, adWatches, miningClaims, retopUps, financialTotals] = await Promise.all([
    prisma.$queryRawUnsafe<{ day: Date; count: bigint }[]>(
      `SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count FROM "User" WHERE "createdAt" >= NOW() - INTERVAL '${days} days' GROUP BY day ORDER BY day`
    ),
    prisma.$queryRawUnsafe<{ day: Date; count: bigint }[]>(
      `SELECT DATE_TRUNC('day', "watchedAt") AS day, COUNT(*)::int AS count FROM "AdWatch" WHERE "watchedAt" >= NOW() - INTERVAL '${days} days' GROUP BY day ORDER BY day`
    ),
    prisma.$queryRawUnsafe<{ day: Date; total: number }[]>(
      `SELECT DATE_TRUNC('day', "createdAt") AS day, SUM(amount)::float AS total FROM "FinancialTransaction" WHERE type = 'MINING' AND "createdAt" >= NOW() - INTERVAL '${days} days' GROUP BY day ORDER BY day`
    ),
    prisma.$queryRawUnsafe<{ day: Date; count: bigint }[]>(
      `SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count FROM "FinancialTransaction" WHERE type = 'RETOPUP' AND "createdAt" >= NOW() - INTERVAL '${days} days' GROUP BY day ORDER BY day`
    ),
    prisma.financialTransaction.groupBy({
      by: ['type'],
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  return res.json({
    signups,
    adWatches,
    miningClaims,
    retopUps,
    financialTotals,
  });
}

export async function updateConfig(req: AuthRequest, res: Response) {
  const data = req.body;
  const config = await prisma.systemConfig.upsert({
    where: { id: 'main' },
    update: data,
    create: { id: 'main', ...data },
  });

  await logAudit({
    userId: req.user!.id,
    action: 'ADMIN_UPDATE_CONFIG',
    details: data,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json(config);
}

export async function releaseAirdrop(req: AuthRequest, res: Response) {
  const { ids } = req.body;
  const result = await prisma.airdrop.updateMany({
    where: { id: { in: ids }, released: false },
    data: { released: true, releasedAt: new Date() },
  });

  await logAudit({
    userId: req.user!.id,
    action: 'ADMIN_RELEASE_AIRDROP',
    details: { ids, released: result.count },
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  return res.json({ released: result.count });
}
