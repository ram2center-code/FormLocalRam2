import { Router } from 'express';
import { FormController } from './form.controller.js';
import { createFormSchema, updateFormSchema, updateFormSettingsSchema, publishFormSchema, shareFormSchema, submitFormSchema, } from './form.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
// 1. Routes สำหรับดูและตอบแบบฟอร์ม (รองรับ Guest เข้าทำได้โดยไม่ต้องล็อกอิน หากฟอร์มตั้งค่า requireLogin = false)
router.get('/:id', optionalAuthenticate, FormController.getById);
router.post('/:id/submit', optionalAuthenticate, validate({ body: submitFormSchema }), FormController.submit);
// 2. Routes อื่นๆ สำหรับการจัดการ/แก้ไข/ดูผลลัพธ์ของฟอร์ม (ต้องผ่านการล็อกอิน)
router.use(authenticate);
router.get('/', FormController.getAll);
router.get('/trash', FormController.getTrash);
router.delete('/trash/empty', FormController.emptyTrash);
router.post('/', validate({ body: createFormSchema }), FormController.create);
router.put('/:id', validate({ body: updateFormSchema }), FormController.update);
router.post('/:id/publish', validate({ body: publishFormSchema }), FormController.publish);
router.patch('/:id/settings', validate({ body: updateFormSettingsSchema }), FormController.updateSettings);
router.post('/:id/share', validate({ body: shareFormSchema }), FormController.share);
router.post('/:id/restore', FormController.restore);
router.get('/:id/submissions', FormController.getSubmissions);
router.delete('/:id/permanent', FormController.deletePermanently);
router.delete('/:id', FormController.delete);
export default router;
