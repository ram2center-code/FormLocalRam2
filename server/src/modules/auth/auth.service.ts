import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  RefreshTokenPayload,
} from '../../utils/jwt.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { LoginInput } from './auth.schema.js';

export interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

export class AuthService {
  static async login(input: LoginInput, meta: ClientMeta) {
    const { username, password } = input;

    // 1. หา User จากชื่อผู้ใช้
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      // บันทึก Audit Log เมื่อพยายาม Login ด้วย username ที่ไม่มีในระบบ
      await createAuditLog({
        userId: null,
        action: 'LOGIN_FAILED',
        entity: 'User',
        meta: { username, reason: 'User not found' },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      throw new Error('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    }

    // 2. ตรวจสอบสถานะการเปิดใช้งาน
    if (!user.isActive) {
      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        meta: { username, reason: 'Account inactive' },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      throw new Error('บัญชีผู้ใช้นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    // 3. ตรวจสอบรหัสผ่านด้วย bcryptjs
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        meta: { username, reason: 'Invalid password' },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      throw new Error('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    }

    // 4. สร้าง Tokens
    const accessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
    });

    // 5. บันทึก Audit Log สำเร็จ
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      meta: {
        username: user.username,
        role: user.role,
        department: user.department?.name ?? null,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    // คืนข้อมูล User ปลอดภัย (ไม่รวม passwordHash)
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      departmentId: user.departmentId,
      department: user.department,
    };

    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  static async refresh(refreshTokenString: string) {
    if (!refreshTokenString) {
      throw new Error('ไม่พบ Refresh Token กรุณาเข้าสู่ระบบใหม่');
    }

    let decoded: RefreshTokenPayload;
    try {
      decoded = verifyRefreshToken(refreshTokenString);
    } catch {
      throw new Error('Refresh Token หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new Error('บัญชีผู้ใช้ถูกระงับหรือไม่มีในระบบ');
    }

    const newAccessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });

    return {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        departmentId: user.departmentId,
        department: user.department,
      },
    };
  }

  static async logout(userId?: string, meta?: ClientMeta) {
    if (userId) {
      await createAuditLog({
        userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
    }
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
}
