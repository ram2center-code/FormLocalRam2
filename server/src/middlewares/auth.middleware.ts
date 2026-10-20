import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken, AccessTokenPayload } from '../utils/jwt.js';
import { prisma } from '../lib/prisma.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  departmentId: string | null;
  departmentName?: string | null;
}

// ขยาย Express Request ให้มี user property
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ (Missing or invalid authorization header)',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    let decoded: AccessTokenPayload;

    try {
      decoded = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Access Token หมดอายุ กรุณา Refresh Token',
        });
        return;
      }
      res.status(401).json({
        success: false,
        code: 'TOKEN_INVALID',
        message: 'Access Token ไม่ถูกต้องหรือถูกปลอมแปลง',
      });
      return;
    }

    // ดึงสถานะล่าสุดจากฐานข้อมูลเพื่อป้องกันกรณีถูก Deactivate หรือแก้ Role ไปแล้ว
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: {
          select: { name: true },
        },
      },
    });

    if (!dbUser) {
      res.status(401).json({
        success: false,
        message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ',
      });
      return;
    }

    if (!dbUser.isActive) {
      res.status(403).json({
        success: false,
        message: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      });
      return;
    }

    req.user = {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: dbUser.role,
      isActive: dbUser.isActive,
      departmentId: dbUser.departmentId,
      departmentName: dbUser.department?.name ?? null,
    };

    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์',
    });
  }
};

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลหรือดำเนินการในส่วนนี้ (Forbidden)',
      });
      return;
    }

    next();
  };
};

/**
 * Middleware สำหรับ Route ที่อาจมีการยืนยันตัวตนหรือไม่ก็ได้ (Optional Auth)
 * ถ้ามี Token ที่ถูกต้อง จะแนบ req.user ให้ แต่ถ้าไม่มี จะไม่บล็อกและปล่อยให้ไปต่อ
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    let decoded: AccessTokenPayload;

    try {
      decoded = verifyAccessToken(token);
    } catch {
      return next();
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: {
          select: { name: true },
        },
      },
    });

    if (dbUser && dbUser.isActive) {
      req.user = {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role,
        isActive: dbUser.isActive,
        departmentId: dbUser.departmentId,
        departmentName: dbUser.department?.name ?? null,
      };
    }
    return next();
  } catch {
    return next();
  }
};

