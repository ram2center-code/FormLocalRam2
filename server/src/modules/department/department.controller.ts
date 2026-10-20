import { Request, Response } from 'express';
import { DepartmentService } from './department.service.js';

const getClientMeta = (req: Request) => ({
  ip: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
  userAgent: req.headers['user-agent'],
});

export class DepartmentController {
  static async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const departments = await DepartmentService.getAll();
      res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนก',
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const department = await DepartmentService.getById(req.params.id as string);
      res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'ไม่พบข้อมูลแผนก',
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const actorId = req.user!.id;
      const department = await DepartmentService.create(req.body, actorId, meta);

      res.status(201).json({
        success: true,
        message: 'สร้างแผนกสำเร็จ',
        data: department,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถสร้างแผนกได้',
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const actorId = req.user!.id;
      const department = await DepartmentService.update(req.params.id as string, req.body, actorId, meta);

      res.status(200).json({
        success: true,
        message: 'แก้ไขแผนกสำเร็จ',
        data: department,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถแก้ไขแผนกได้',
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const actorId = req.user!.id;
      const result = await DepartmentService.delete(req.params.id as string, actorId, meta);

      res.status(200).json({
        success: true,
        message: `ลบแผนก "${result.name}" สำเร็จ`,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถลบแผนกได้',
      });
    }
  }
}
