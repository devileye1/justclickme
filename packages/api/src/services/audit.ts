import { prisma } from '../db';

export interface AuditPayload {
  userId?: string;
  targetId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(payload: AuditPayload) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        targetId: payload.targetId,
        action: payload.action,
        details: payload.details ?? {},
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
      },
    });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}
