import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAuditLog } from '../auditLog/auditLog.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'system-settings.json');

export interface SystemSettingsData {
  systemFont: 'Sarabun' | 'IBMPlexSans';
  updatedAt: string | null;
  updatedBy: string | null;
}

const DEFAULT_SETTINGS: SystemSettingsData = {
  systemFont: 'Sarabun',
  updatedAt: null,
  updatedBy: null,
};

const readSettings = (): SystemSettingsData => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return DEFAULT_SETTINGS;
    }
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      systemFont: parsed.systemFont === 'IBMPlexSans' ? 'IBMPlexSans' : 'Sarabun',
      updatedAt: parsed.updatedAt || null,
      updatedBy: parsed.updatedBy || null,
    };
  } catch (error) {
    console.error('Error reading settings file:', error);
    return DEFAULT_SETTINGS;
  }
};

const writeSettings = (data: SystemSettingsData): void => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

export const getSystemSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = readSettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลการตั้งค่าระบบได้',
    });
  }
};

export const updateSystemSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { systemFont } = req.body;

    if (!systemFont || !['Sarabun', 'IBMPlexSans'].includes(systemFont)) {
      res.status(400).json({
        success: false,
        message: 'กรุณาระบุฟอนต์ที่ถูกต้อง ("Sarabun" หรือ "IBMPlexSans")',
      });
      return;
    }

    const currentSettings = readSettings();
    const previousFont = currentSettings.systemFont;

    const newSettings: SystemSettingsData = {
      systemFont,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.fullName || req.user?.username || 'ADMIN',
    };

    writeSettings(newSettings);

    // Record audit log
    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE_SYSTEM_FONT',
      entity: 'SystemSetting',
      meta: {
        previousFont,
        newFont: systemFont,
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(200).json({
      success: true,
      data: newSettings,
      message: `เปลี่ยนฟอนต์ระบบเป็น ${systemFont === 'IBMPlexSans' ? 'IBM Plex Sans' : 'Sarabun'} สำเร็จแล้ว`,
    });
  } catch (error: any) {
    console.error('Error updating system settings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่าระบบ',
    });
  }
};

// ==========================================
// การจัดการการเชื่อมต่อฐานข้อมูล (Database Switcher)
// ==========================================

import { getDbStatus, pingDatabase, switchDatabaseTarget, DatabaseTarget } from '../../utils/dbManager.js';

export const getDatabaseSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await getDbStatus();
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถตรวจสอบสถานะฐานข้อมูลได้: ' + (error.message || ''),
    });
  }
};

export const testDatabaseConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ success: false, message: 'กรุณาระบุ Connection String เพื่อทดสอบ' });
      return;
    }
    const testResult = await pingDatabase(url);
    if (testResult.ok) {
      res.status(200).json({
        success: true,
        message: 'เชื่อมต่อฐานข้อมูลสำเร็จ!',
        latencyMs: testResult.latencyMs,
      });
    } else {
      res.status(400).json({
        success: false,
        message: testResult.error || 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการทดสอบการเชื่อมต่อ',
    });
  }
};

export const switchDatabase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { target, supabaseUrl } = req.body;
    if (!target || !['LOCAL', 'SUPABASE'].includes(target)) {
      res.status(400).json({ success: false, message: 'กรุณาระบุ target เป็น "LOCAL" หรือ "SUPABASE"' });
      return;
    }

    const previousDb = process.env.ACTIVE_DB || 'LOCAL';
    const result = await switchDatabaseTarget(target as DatabaseTarget, supabaseUrl);

    // บันทึก Audit Log
    await createAuditLog({
      userId: req.user?.id,
      action: 'SWITCH_DATABASE_TARGET',
      entity: 'SystemSetting',
      meta: {
        from: previousDb,
        to: target,
        latencyMs: result.latencyMs,
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        activeDb: result.activeDb,
        latencyMs: result.latencyMs,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการสลับฐานข้อมูล',
    });
  }
};

