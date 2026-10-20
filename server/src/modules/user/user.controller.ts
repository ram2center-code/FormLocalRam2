import { Request, Response } from 'express';
import { UserService } from './user.service.js';
import { Role } from '@prisma/client';

const getClientMeta = (req: Request) => ({
  ip: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
  userAgent: req.headers['user-agent'],
});

export class UserController {
  static async lookup(req: Request, res: Response): Promise<void> {
    try {
      const search = req.query.search ? String(req.query.search).trim() : undefined;
      const users = await UserService.lookup(search);
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'ไม่สามารถค้นหาผู้ใช้งานได้',
      });
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { search, departmentId, role, isActive } = req.query;

      const filters = {
        search: search ? String(search).trim() : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
        role: role ? (String(role) as Role) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      };

      const users = await UserService.getAll(filters);
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน',
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const user = await UserService.getById(req.params.id as string);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'ไม่พบข้อมูลผู้ใช้งาน',
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const actorId = req.user!.id;
      const user = await UserService.create(req.body, actorId, meta);

      res.status(201).json({
        success: true,
        message: `สร้างผู้ใช้งาน "${user.username}" สำเร็จ`,
        data: user,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถสร้างผู้ใช้งานได้',
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const actorId = req.user!.id;
      const user = await UserService.update(req.params.id as string, req.body, actorId, meta);

      res.status(200).json({
        success: true,
        message: `แก้ไขข้อมูลผู้ใช้งาน "${user.username}" สำเร็จ`,
        data: user,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถแก้ไขข้อมูลผู้ใช้งานได้',
      });
    }
  }

  static async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const actorId = req.user!.id;
      const { isActive } = req.body;

      const user = await UserService.toggleStatus(req.params.id as string, Boolean(isActive), actorId, meta);

      res.status(200).json({
        success: true,
        message: `เปลี่ยนสถานะผู้ใช้ "${user.username}" เป็น ${user.isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} แล้ว`,
        data: user,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถเปลี่ยนสถานะผู้ใช้งานได้',
      });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const actorId = req.user!.id;
      const result = await UserService.resetPassword(req.params.id as string, req.body, actorId, meta);

      res.status(200).json({
        success: true,
        message: `รีเซ็ตรหัสผ่านสำหรับ "${result.username}" สำเร็จเรียบร้อย`,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้',
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const actorId = req.user!.id;
      const result = await UserService.delete(req.params.id as string, actorId, meta);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { action: result.action },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถลบผู้ใช้งานได้',
      });
    }
  }
}
