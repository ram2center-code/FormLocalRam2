import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { FormService } from './form.service.js';

const getClientMeta = (req: Request) => ({
  ip: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
  userAgent: req.headers['user-agent'],
});

export class FormController {
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const forms = await FormService.getForms(user.id, user.role, user.departmentId);
      res.status(200).json({ success: true, data: forms });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการดึงรายการแบบฟอร์ม',
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const forEditing = req.query.forEditing === 'true';
      const form = await FormService.getById(
        req.params.id as string,
        user?.id || '',
        (user?.role as Role) || Role.USER,
        user?.departmentId || null,
        forEditing
      );
      res.status(200).json({ success: true, data: form });
    } catch (error: any) {
      res.status(403).json({
        success: false,
        message: error.message || 'ไม่สามารถเข้าถึงแบบฟอร์มนี้ได้',
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const user = req.user!;
      const form = await FormService.create(req.body, user.id, meta);

      res.status(201).json({
        success: true,
        message: `สร้างแบบฟอร์ม "${form.title}" เรียบร้อยแล้ว`,
        data: form,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถสร้างแบบฟอร์มได้',
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const user = req.user!;
      const form = await FormService.update(req.params.id as string, req.body, user.id, user.role, meta);

      res.status(200).json({
        success: true,
        message: 'บันทึกแบบฟอร์มสำเร็จ',
        data: form,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถบันทึกแบบฟอร์มได้',
      });
    }
  }

  static async publish(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const user = req.user!;
      const result = await FormService.publish(
        req.params.id as string,
        req.body,
        user.id,
        user.role,
        meta
      );

      res.status(200).json({
        success: true,
        message: `เผยแพร่แบบฟอร์มสำเร็จ (เวอร์ชัน ${result.version})`,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถเผยแพร่แบบฟอร์มได้',
      });
    }
  }

  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const user = req.user!;
      const updated = await FormService.updateSettings(
        req.params.id as string,
        req.body,
        user.id,
        user.role,
        meta
      );

      res.status(200).json({
        success: true,
        message: 'บันทึกการตั้งค่าแบบฟอร์มสำเร็จ',
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถตั้งค่าแบบฟอร์มได้',
      });
    }
  }

  static async share(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const user = req.user!;
      const result = await FormService.shareForm(
        req.params.id as string,
        req.body.userIds,
        user.id,
        user.role,
        meta
      );

      res.status(200).json({
        success: true,
        message: `แชร์แบบฟอร์มให้ผู้ใช้ ${result.count} คนสำเร็จ`,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถแชร์แบบฟอร์มได้',
      });
    }
  }

  static async getTrash(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const forms = await FormService.getTrash(user.id, user.role);
      res.status(200).json({ success: true, data: forms });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการดึงรายการถังขยะ',
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const user = req.user!;
      const result = await FormService.moveToTrash(req.params.id as string, user.id, user.role, meta);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { action: result.action },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถย้ายแบบฟอร์มไปถังขยะได้',
      });
    }
  }

  static async restore(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const user = req.user!;
      const result = await FormService.restore(req.params.id as string, user.id, user.role, meta);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { action: result.action },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถกู้คืนแบบฟอร์มได้',
      });
    }
  }

  static async deletePermanently(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const user = req.user!;
      const result = await FormService.deletePermanently(req.params.id as string, user.id, user.role, meta);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { action: result.action },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถลบแบบฟอร์มอย่างถาวรได้',
      });
    }
  }

  static async emptyTrash(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const user = req.user!;
      const result = await FormService.emptyTrash(user.id, user.role, meta);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { count: result.count },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ไม่สามารถล้างถังขยะได้',
      });
    }
  }

  static async submit(req: Request, res: Response): Promise<void> {
    try {
      const meta = getClientMeta(req);
      const user = req.user;
      const result = await FormService.submit(
        req.params.id as string,
        req.body.answers,
        user?.id || null,
        (user?.role as Role) || Role.USER,
        user?.departmentId || null,
        meta,
        req.body.pdpaConsent
      );

      res.status(200).json({
        success: true,
        message: 'ส่งคำตอบแบบฟอร์มสำเร็จ',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ส่งคำตอบไม่สำเร็จ',
      });
    }
  }

  static async getSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const result = await FormService.getSubmissions(
        req.params.id as string,
        user.id,
        user.role
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(403).json({
        success: false,
        message: error.message || 'ไม่สามารถดึงข้อมูลผลตอบกลับได้',
      });
    }
  }
}

