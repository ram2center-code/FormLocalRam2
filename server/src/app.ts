import 'dotenv/config';
import os from 'os';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRouter from './modules/auth/auth.routes.js';
import departmentRouter from './modules/department/department.routes.js';
import userRouter from './modules/user/user.routes.js';
import formRouter from './modules/form/form.routes.js';
import settingRouter from './modules/setting/setting.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Trust proxy for Vercel / reverse proxies
app.set('trust proxy', 1);

// 1. Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // อนุญาต request ที่ไม่มี Origin (เช่น mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // ตรวจสอบว่า Origin เป็น CLIENT_URL, Vercel domains, localhost หรือ IP วง LAN
      const isAllowed =
        origin === CLIENT_URL ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        /^http:\/\/(192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|10\.)/.test(origin);

      if (isAllowed || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2. Body & Cookie Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 3. Health Check & Network Info
app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get(['/api/network-info', '/network-info'], (_req: Request, res: Response) => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  res.status(200).json({
    success: true,
    primaryIp: addresses[0] || 'localhost',
    addresses,
    clientPort: 5173,
  });
});

// 4. API Routes (mount on both /api and root path to support any proxy/rewrite configuration)
app.use(['/api/auth', '/auth'], authRouter);
app.use(['/api/departments', '/departments'], departmentRouter);
app.use(['/api/users', '/users'], userRouter);
app.use(['/api/forms', '/forms'], formRouter);
app.use(['/api/settings', '/settings'], settingRouter);

// 5. 404 Not Found Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'ไม่พบ API endpoint ที่เรียกใช้งาน',
  });
});

// 6. Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
  });
});

// Start Server (only when run directly as a standalone Node server, not when wrapped by Vercel serverless runtime)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 FormLocal Server running on http://localhost:${PORT}`);
    console.log(`📡 CORS allowed for: ${CLIENT_URL}`);
  });
}

export default app;
