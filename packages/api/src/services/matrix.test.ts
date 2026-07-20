import { describe, it, expect } from 'vitest';
import { prisma } from '../db';
import * as matrixService from './matrix';

describe('Matrix Service Integration', () => {
  it('should create a user and place them as root when first to activate', async () => {
    const result = await matrixService.handleActivation('0xUser1', undefined);

    expect(result.user.walletAddress).toBe('0xuser1');
    expect(result.position.globalId).toBe(1);
    expect(result.position.parentId).toBeNull();
    expect(result.position.level).toBe(1);
  });

  it('should place 3 children under root in BFS order', async () => {
    await matrixService.handleActivation('0xRoot', undefined);
    await matrixService.handleActivation('0xChild1', '0xRoot');
    await matrixService.handleActivation('0xChild2', '0xRoot');
    await matrixService.handleActivation('0xChild3', '0xRoot');

    const root = await prisma.matrixPosition.findUnique({
      where: { userId: (await prisma.user.findUnique({ where: { walletAddress: '0xroot' } }))!.id },
      include: { children: true },
    });

    expect(root!.children.length).toBe(3);
    expect(root!.children.every((c) => c.parentId === root!.globalId)).toBe(true);
  });

  it('should spill over to next available parent after 3 children', async () => {
    await matrixService.handleActivation('0xRoot', undefined);
    for (let i = 1; i <= 3; i++) {
      await matrixService.handleActivation(`0xChild${i}`, '0xRoot');
    }
    await matrixService.handleActivation('0xGrandChild1', '0xChild1');

    const grandChild = await prisma.matrixPosition.findUnique({
      where: { userId: (await prisma.user.findUnique({ where: { walletAddress: '0xgrandchild1' } }))!.id },
    });

    const child1 = await prisma.matrixPosition.findUnique({
      where: { userId: (await prisma.user.findUnique({ where: { walletAddress: '0xchild1' } }))!.id },
    });

    expect(grandChild!.parentId).toBe(child1!.globalId);
  });

  it('should distribute level income to 10 upline levels', async () => {
    const users: string[] = [];
    for (let i = 0; i < 11; i++) {
      const wallet = `0xLevel${i}`;
      users.push(wallet);
      await prisma.user.create({ data: { walletAddress: wallet.toLowerCase() } });
    }

    let parentId: number | null = null;
    for (let i = 0; i < 11; i++) {
      const created: { globalId: number } = await prisma.matrixPosition.create({
        data: {
          userId: (await prisma.user.findUnique({ where: { walletAddress: users[i].toLowerCase() } }))!.id,
          parentId,
          level: i + 1,
        },
      });
      parentId = created.globalId;
    }

    const lastUser = await prisma.user.findUnique({ where: { walletAddress: users[10].toLowerCase() } });
    const payments = await matrixService.distributeLevelIncome(lastUser!.id);

    expect(payments.length).toBe(10);
    expect(payments[0].amount).toBe(3);
    expect(payments[1].amount).toBe(2);
    expect(payments[9].amount).toBe(0.3);
  });

  it('should increment personal pool counts for ancestors', async () => {
    await matrixService.handleActivation('0xRoot', undefined);
    await matrixService.handleActivation('0xChild', '0xRoot');
    await matrixService.handleActivation('0xGrandChild', '0xChild');

    const root = await prisma.matrixPosition.findUnique({
      where: { userId: (await prisma.user.findUnique({ where: { walletAddress: '0xroot' } }))!.id },
    });

    expect(root!.personalPoolCount).toBeGreaterThan(0);
  });

  it('should reset personal pool at 40 users and credit matrix balance', async () => {
    await matrixService.handleActivation('0xRoot', undefined);
    await matrixService.handleActivation('0xChild', '0xRoot');
    const rootUser = await prisma.user.findUnique({ where: { walletAddress: '0xroot' } });

    for (let i = 1; i <= 40; i++) {
      await matrixService.handleActivation(`0xPool${i}`, '0xChild');
    }

    const rootPosition = await prisma.matrixPosition.findUnique({
      where: { userId: rootUser!.id },
      include: { user: true },
    });

    expect(rootPosition!.user.matrixBalance).toBeGreaterThan(0);
    expect(rootPosition!.user.indirectCycles).toBe(1);

    const resetLogs = await prisma.poolResetLog.findMany({ where: { userId: rootUser!.id } });
    expect(resetLogs.length).toBe(1);
  }, 30000);

  it('should cap unqualified users after 1 cycle', async () => {
    await matrixService.handleActivation('0xRoot', undefined);
    const rootUser = await prisma.user.findUnique({ where: { walletAddress: '0xroot' } });

    await prisma.user.update({
      where: { id: rootUser!.id },
      data: { indirectCycles: 1 },
    });
    await prisma.matrixPosition.update({
      where: { userId: rootUser!.id },
      data: { personalPoolCount: 40 },
    });

    await matrixService.resetPersonalPool(rootUser!.id);

    const updatedRoot = await prisma.user.findUnique({ where: { id: rootUser!.id } });
    expect(updatedRoot!.isCapped).toBe(true);
  });

  it('should reset cap on re-top-up', async () => {
    await matrixService.handleActivation('0xRoot', undefined);
    const rootUser = await prisma.user.findUnique({ where: { walletAddress: '0xroot' } });

    await prisma.user.update({
      where: { id: rootUser!.id },
      data: { isCapped: true, indirectCycles: 1 },
    });

    await matrixService.handleReTopUp('0xRoot');

    const updatedRoot = await prisma.user.findUnique({ where: { id: rootUser!.id } });
    expect(updatedRoot!.isCapped).toBe(false);
    expect(updatedRoot!.indirectCycles).toBe(0);
  });

  it('should qualify user after 3 direct referrals', async () => {
    await matrixService.handleActivation('0xRoot', undefined);
    for (let i = 1; i <= 3; i++) {
      await matrixService.handleActivation(`0xDirect${i}`, '0xRoot');
    }

    const root = await prisma.user.findUnique({ where: { walletAddress: '0xroot' } });
    expect(root!.directReferrals).toBe(3);
    expect(root!.isQualified).toBe(true);
  });
});
