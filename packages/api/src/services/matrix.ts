import { prisma } from '../db';

const LEVEL_AMOUNTS = [3, 2, 1.5, 1, 0.7, 0.5, 0.4, 0.3, 0.3, 0.3];
const PERSONAL_POOL_MAX = 40;

export async function ensureSystemConfig() {
  return prisma.systemConfig.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main' },
  });
}

export async function findOrCreateUser(walletAddress: string, sponsorWallet?: string) {
  const existing = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
  if (existing) return existing;

  let referrerId: string | undefined;
  if (sponsorWallet) {
    const referrer = await prisma.user.findUnique({
      where: { walletAddress: sponsorWallet.toLowerCase() },
    });
    if (referrer) referrerId = referrer.id;
  }

  const user = await prisma.user.create({
    data: {
      walletAddress: walletAddress.toLowerCase(),
      referrerId,
    },
  });

  if (referrerId) {
    await prisma.user.update({
      where: { id: referrerId },
      data: { directReferrals: { increment: 1 } },
    });
    const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
    if (referrer && referrer.directReferrals + 1 >= referrer.directsRequired) {
      await prisma.user.update({
        where: { id: referrerId },
        data: { isQualified: true, indirectCap: 5 },
      });
    }
  }

  return user;
}

export async function placeInMatrix(userId: string) {
  const existing = await prisma.matrixPosition.findUnique({ where: { userId } });
  if (existing) return existing;

  const root = await prisma.matrixPosition.findFirst({
    where: { parentId: null },
    orderBy: { globalId: 'asc' },
  });

  if (!root) {
    return prisma.matrixPosition.create({
      data: { userId, parentId: null, level: 1 },
    });
  }

  const allPositions = await prisma.matrixPosition.findMany({
    orderBy: { globalId: 'asc' },
    include: { children: true },
  });

  let parentId: number | null = null;
  for (const pos of allPositions) {
    if (pos.children.length < 3) {
      parentId = pos.globalId;
      break;
    }
  }

  if (parentId === null) parentId = root.globalId;

  const parent = allPositions.find((p) => p.globalId === parentId)!;
  return prisma.matrixPosition.create({
    data: {
      userId,
      parentId,
      level: parent.level + 1,
    },
  });
}

export async function distributeLevelIncome(activatedUserId: string) {
  const payments: { userId: string; amount: number; level: number }[] = [];
  const position = await prisma.matrixPosition.findUnique({
    where: { userId: activatedUserId },
  });

  if (!position || !position.parentId) return payments;

  let parentId: number | null = position.parentId;
  for (let i = 0; i < 10; i++) {
    if (!parentId) break;
    const parent = (await prisma.matrixPosition.findUnique({
      where: { globalId: parentId },
      include: { user: true },
    })) as { id: string; globalId: number; parentId: number | null; user: { id: string; isCapped: boolean } } | null;
    if (!parent) break;

    const amount = LEVEL_AMOUNTS[i];
    if (!parent.user.isCapped) {
      await prisma.user.update({
        where: { id: parent.user.id },
        data: { matrixBalance: { increment: amount } },
      });
      await prisma.matrixLevelPayment.create({
        data: {
          userId: parent.user.id,
          fromUserId: activatedUserId,
          level: i + 1,
          amount,
        },
      });
      payments.push({ userId: parent.user.id, amount, level: i + 1 });
    }
    parentId = parent.parentId;
  }

  return payments;
}

export async function updatePersonalPool(activatedUserId: string) {
  const activatedPosition = await prisma.matrixPosition.findUnique({
    where: { userId: activatedUserId },
  });
  if (!activatedPosition || !activatedPosition.parentId) return;

  let parentId: number | null = activatedPosition.parentId;
  for (let depth = 0; depth < 3; depth++) {
    if (!parentId) break;
    const parent = (await prisma.matrixPosition.findUnique({
      where: { globalId: parentId },
      include: { user: true },
    })) as { id: string; globalId: number; parentId: number | null; user: { id: string; isCapped: boolean } } | null;
    if (!parent) break;

    await prisma.matrixPosition.update({
      where: { id: parent.id },
      data: {
        personalPoolCount: { increment: 1 },
        poolReserves: { increment: 5 },
      },
    });

    const updated = await prisma.matrixPosition.findUnique({
      where: { id: parent.id },
      include: { user: true },
    });

    if (updated && updated.personalPoolCount >= PERSONAL_POOL_MAX && !updated.user.isCapped) {
      await resetPersonalPool(updated.user.id);
    }

    parentId = parent.parentId;
  }
}

export async function resetPersonalPool(userId: string) {
  const position = await prisma.matrixPosition.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!position) return;

  const cap = position.user.indirectCap;
  if (position.user.indirectCycles >= cap) {
    await prisma.user.update({ where: { id: userId }, data: { isCapped: true } });
    return;
  }

  const credit = 10;
  await prisma.user.update({
    where: { id: userId },
    data: {
      matrixBalance: { increment: credit },
      indirectCycles: { increment: 1 },
    },
  });

  await prisma.matrixPosition.update({
    where: { id: position.id },
    data: {
      personalPoolCount: 0,
      poolReserves: { decrement: 5 },
      subIds: { push: `sub-${Date.now()}` },
    },
  });

  await prisma.poolResetLog.create({
    data: {
      userId,
      cycle: position.user.indirectCycles + 1,
      amountCredited: credit,
    },
  });
}

export async function handleActivation(walletAddress: string, sponsorWallet?: string) {
  const user = await findOrCreateUser(walletAddress, sponsorWallet);
  const position = await placeInMatrix(user.id);
  const levelPayments = await distributeLevelIncome(user.id);
  await updatePersonalPool(user.id);
  return { user, position, levelPayments };
}

export async function handleReTopUp(walletAddress: string) {
  const user = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
  if (!user) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: { indirectCycles: 0, isCapped: false },
  });

  const position = await placeInMatrix(user.id);
  await distributeLevelIncome(user.id);
  await updatePersonalPool(user.id);

  return { user, position };
}

export async function getMatrixTree(userId: string) {
  return prisma.matrixPosition.findUnique({
    where: { userId },
    include: {
      children: {
        include: {
          user: { select: { walletAddress: true } },
          children: {
            include: {
              user: { select: { walletAddress: true } },
            },
          },
        },
      },
      user: { select: { walletAddress: true } },
    },
  });
}
