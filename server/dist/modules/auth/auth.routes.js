import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { loginSchema } from './auth.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../../middlewares/rateLimit.middleware.js';
const router = Router();
// POST /api/auth/login - Rate limited + Zod validated
router.post('/login', loginRateLimiter, validate({ body: loginSchema }), AuthController.login);
// POST /api/auth/refresh - Read refresh token from httpOnly cookie
router.post('/refresh', AuthController.refresh);
// POST /api/auth/logout - Requires authentication to log out & log audit
router.post('/logout', authenticate, AuthController.logout);
// GET /api/auth/me - Get current user profile
router.get('/me', authenticate, AuthController.me);
export default router;
