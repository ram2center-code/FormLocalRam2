import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { getSystemSettings, updateSystemSettings, getDatabaseSettings, testDatabaseConnection, switchDatabase, } from './setting.controller.js';
const router = Router();
// Public endpoint to read current system font (so all users & public forms reflect it)
router.get('/', getSystemSettings);
// Admin-only endpoint to update system settings
router.patch('/', authenticate, authorize(Role.ADMIN), updateSystemSettings);
// Database Manager endpoints (Admin only)
router.get('/database', authenticate, authorize(Role.ADMIN), getDatabaseSettings);
router.post('/database/test', authenticate, authorize(Role.ADMIN), testDatabaseConnection);
router.post('/database/switch', authenticate, authorize(Role.ADMIN), switchDatabase);
export default router;
