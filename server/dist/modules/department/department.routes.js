import { Router } from 'express';
import { DepartmentController } from './department.controller.js';
import { createDepartmentSchema, updateDepartmentSchema } from './department.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
const router = Router();
// แผนกจัดการได้เฉพาะ ADMIN เท่านั้น
router.use(authenticate, authorize('ADMIN'));
router.get('/', DepartmentController.getAll);
router.get('/:id', DepartmentController.getById);
router.post('/', validate({ body: createDepartmentSchema }), DepartmentController.create);
router.put('/:id', validate({ body: updateDepartmentSchema }), DepartmentController.update);
router.delete('/:id', DepartmentController.delete);
export default router;
