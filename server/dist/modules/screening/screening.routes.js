import { Router } from 'express';
import { ScreeningController } from './screening.controller.js';
import { createScreeningRecordSchema } from './screening.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { optionalAuthenticate, authenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
// บันทึกผลการคัดกรอง (รองรับทั้งผู้ใช้งานที่ล็อกอินและโหมดคนไข้ทั่วไป)
router.post('/', optionalAuthenticate, validate({ body: createScreeningRecordSchema }), ScreeningController.create);
// ดึงรายการประวัติการคัดกรอง
router.get('/', authenticate, ScreeningController.getAll);
// สถิติภาพรวม
router.get('/stats', authenticate, ScreeningController.getStats);
// ข้อความและนโยบาย PDPA สำหรับ Suite คัดกรอง
router.get('/pdpa-config', ScreeningController.getPdpaConfig);
router.put('/pdpa-config', optionalAuthenticate, ScreeningController.updatePdpaConfig);
// รายละเอียดผลการคัดกรองรายบุคคล
router.get('/:id', authenticate, ScreeningController.getById);
// ลบประวัติ
router.delete('/:id', authenticate, ScreeningController.delete);
export default router;
