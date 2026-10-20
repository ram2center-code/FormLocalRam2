import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
}

export const createAuditLog = async (params: CreateAuditLogParams) => {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity ?? null,
        entityId: params.entityId ?? null,
        meta: params.meta ?? Prisma.JsonNull,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (error) {
    // Audit log should never crash the main transaction/request, but warn in server logs
    console.error('⚠️ [AuditLog Failed to record]:', error);
    return null;
  }
};
