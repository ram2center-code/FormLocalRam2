import { Router } from 'express';
import { UserController } from './user.controller.js';
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  toggleUserStatusSchema,
} from './user.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// ทุก Route ในการเข้าถึงผู้ใช้ต้องผ่านการยืนยันตัวตน
router.use(authenticate);

// Endpoint สำหรับค้นหาผู้ใช้เพื่อนำไปแชร์ฟอร์ม หรือ Assign งาน (ผู้ใช้ล็อกอินทุกคนเข้าถึงได้)
router.get('/lookup', UserController.lookup);

// เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่เข้าถึงการจัดการ CRUD ผู้ใช้ได้
router.use(authorize('ADMIN'));

router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', validate({ body: createUserSchema }), UserController.create);
router.put('/:id', validate({ body: updateUserSchema }), UserController.update);
router.patch('/:id/status', validate({ body: toggleUserStatusSchema }), UserController.toggleStatus);
router.patch('/:id/reset-password', validate({ body: resetPasswordSchema }), UserController.resetPassword);
router.delete('/:id', UserController.delete);

export default router;
