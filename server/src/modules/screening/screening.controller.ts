import { Request, Response } from 'express';
import { ScreeningService } from './screening.service.js';

export class ScreeningController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const record = await ScreeningService.create(
        req.body,
        user?.id,
        user?.fullName || user?.username
      );
      res.status(201).json({
        success: true,
        message: 'บันทึกผลการคัดกรองลงฐานข้อมูลเรียบร้อยแล้ว',
        data: record,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการคัดกรอง',
      });
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { search, hasAlert, hasSuicideRisk, page, limit } = req.query;
      const result = await ScreeningService.getAll({
        search: search as string | undefined,
        hasAlert: hasAlert !== undefined ? hasAlert === 'true' : undefined,
        hasSuicideRisk: hasSuicideRisk !== undefined ? hasSuicideRisk === 'true' : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json({
        success: true,
        data: result.records,
        meta: result.meta,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการคัดกรอง',
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const record = await ScreeningService.getById(req.params.id as string);
      if (!record) {
        res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลผลการคัดกรองที่ระบุ',
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await ScreeningService.delete(req.params.id as string);
      res.status(200).json({
        success: true,
        message: 'ลบประวัติการคัดกรองเรียบร้อยแล้ว',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการลบข้อมูล',
      });
    }
  }

  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await ScreeningService.getStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการดึงสถิติ',
      });
    }
  }
}
