import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { Role } from '@prisma/client';
import {
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
} from './user.schema.js';

export interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

export interface UserQueryFilters {
  search?: string;
  departmentId?: string;
  role?: Role;
  isActive?: boolean;
}

export class UserService {
  /**
   * ค้นหาผู้ใช้สำหรับแชร์ฟอร์ม หรือ Assign งาน (เฉพาะผู้ใช้งานที่ Active)
   */
  static async lookup(search?: string) {
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }
    return prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        department: { select: { id: true, name: true } },
      },
      take: 50,
      orderBy: { fullName: 'asc' },
    });
  }

  static async getAll(filters: UserQueryFilters) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { username: { contains: filters.search, mode: 'insensitive' } },
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            forms: true,
            submissions: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { role: 'asc' }, // ADMIN มาก่อน
        { fullName: 'asc' },
      ],
    });
  }

  static async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งาน');
    }

    return user;
  }

  static async create(input: CreateUserInput, actorId: string, meta: ClientMeta) {
    // 1. ตรวจสอบ Username ซ้ำ
    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existingUsername) {
      throw new Error(`ชื่อผู้ใช้งาน "${input.username}" มีอยู่ในระบบแล้ว`);
    }

    // 2. ตรวจสอบ Email ซ้ำ
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw new Error(`อีเมล "${input.email}" มีอยู่ในระบบแล้ว`);
    }

    // 3. ตรวจสอบ Department ถ้ามีการระบุ
    if (input.departmentId) {
      const deptExists = await prisma.department.findUnique({
        where: { id: input.departmentId },
      });
      if (!deptExists) {
        throw new Error('ไม่พบแผนกที่ระบุในระบบ');
      }
    }

    // 4. เข้ารหัสรหัสผ่านด้วย bcryptjs
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        departmentId: input.departmentId || null,
        isActive: input.isActive ?? true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: {
          select: { id: true, name: true },
        },
        createdAt: true,
      },
    });

    // 5. บันทึก Audit Log
    await createAuditLog({
      userId: actorId,
      action: 'USER_CREATE',
      entity: 'User',
      entityId: user.id,
      meta: {
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        department: user.department?.name ?? null,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return user;
  }

  static async update(id: string, input: UpdateUserInput, actorId: string, meta: ClientMeta) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งานที่ต้องการแก้ไข');
    }

    // ป้องกัน Admin ปิดการใช้งานตนเอง
    if (actorId === id && input.isActive === false) {
      throw new Error('คุณไม่สามารถระงับการใช้งานบัญชีของตนเองได้');
    }

    // ป้องกัน Admin ปลดสิทธิ์ Admin ของตนเอง
    if (actorId === id && input.role !== Role.ADMIN) {
      throw new Error('คุณไม่สามารถลดสิทธิ์ผู้ดูแลระบบของตนเองได้');
    }

    // ตรวจสอบ Email ซ้ำกับผู้อื่น
    const duplicateEmail = await prisma.user.findFirst({
      where: {
        email: input.email,
        NOT: { id },
      },
    });
    if (duplicateEmail) {
      throw new Error(`อีเมล "${input.email}" ถูกใช้งานโดยผู้ใช้อื่นแล้ว`);
    }

    if (input.departmentId) {
      const deptExists = await prisma.department.findUnique({
        where: { id: input.departmentId },
      });
      if (!deptExists) {
        throw new Error('ไม่พบแผนกที่ระบุในระบบ');
      }
    }

    const previousData = {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId,
      isActive: user.isActive,
    };

    const updated = await prisma.user.update({
      where: { id },
      data: {
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        departmentId: input.departmentId || null,
        isActive: input.isActive,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId: actorId,
      action: 'USER_UPDATE',
      entity: 'User',
      entityId: updated.id,
      meta: {
        before: previousData,
        after: {
          email: updated.email,
          fullName: updated.fullName,
          role: updated.role,
          departmentId: updated.departmentId,
          isActive: updated.isActive,
        },
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return updated;
  }

  static async toggleStatus(id: string, isActive: boolean, actorId: string, meta: ClientMeta) {
    if (actorId === id && !isActive) {
      throw new Error('คุณไม่สามารถระงับการใช้งานบัญชีของตนเองได้');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้งาน');

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        username: true,
        fullName: true,
        isActive: true,
      },
    });

    await createAuditLog({
      userId: actorId,
      action: 'USER_STATUS_TOGGLE',
      entity: 'User',
      entityId: id,
      meta: {
        username: updated.username,
        isActive: updated.isActive,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return updated;
  }

  static async resetPassword(id: string, input: ResetPasswordInput, actorId: string, meta: ClientMeta) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้งาน');

    const passwordHash = await bcrypt.hash(input.newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await createAuditLog({
      userId: actorId,
      action: 'USER_PASSWORD_RESET',
      entity: 'User',
      entityId: id,
      meta: {
        username: user.username,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { id, username: user.username };
  }

  static async delete(id: string, actorId: string, meta: ClientMeta) {
    if (actorId === id) {
      throw new Error('คุณไม่สามารถลบบัญชีของตนเองได้');
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            forms: true,
            submissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งานที่ต้องการลบ');
    }

    // สถาปัตยกรรมความปลอดภัย: ถ้าเคยมีประวัติฟอร์มหรือส่งข้อสอบ จะทำ Soft Deactivate แทน Hard Delete
    if (user._count.forms > 0 || user._count.submissions > 0) {
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      await createAuditLog({
        userId: actorId,
        action: 'USER_DEACTIVATE_INSTEAD_OF_DELETE',
        entity: 'User',
        entityId: id,
        meta: {
          username: user.username,
          formsCount: user._count.forms,
          submissionsCount: user._count.submissions,
          reason: 'User has historical data; deactivated instead of hard-delete',
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return {
        action: 'deactivated',
        message: `ผู้ใช้ "${user.username}" มีประวัติสร้างฟอร์ม (${user._count.forms}) หรือส่งผลสอบ (${user._count.submissions}) ในระบบแล้ว ระบบจึงเปลี่ยนเป็น "ระงับการใช้งาน" แทนเพื่อรักษาประวัติข้อมูล`,
      };
    }

    // ถ้าไม่มีประวัติ สามารถ Hard Delete ได้อย่างปลอดภัย
    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      userId: actorId,
      action: 'USER_DELETE',
      entity: 'User',
      entityId: id,
      meta: { username: user.username },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      action: 'deleted',
      message: `ลบผู้ใช้ "${user.username}" ออกจากระบบเรียบร้อยแล้ว`,
    };
  }
}
