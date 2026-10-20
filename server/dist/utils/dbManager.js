import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../../.env');
/**
 * ซ่อนรหัสผ่านใน Connection URL เพื่อความปลอดภัย
 */
export function maskDatabaseUrl(url) {
    if (!url)
        return '';
    try {
        const atIndex = url.lastIndexOf('@');
        if (atIndex === -1)
            return url;
        const protocolIndex = url.indexOf('://');
        if (protocolIndex === -1)
            return url;
        const authPart = url.substring(protocolIndex + 3, atIndex);
        const colonIndex = authPart.indexOf(':');
        if (colonIndex === -1)
            return url;
        const user = authPart.substring(0, colonIndex);
        return `${url.substring(0, protocolIndex + 3)}${user}:••••••••@${url.substring(atIndex + 1)}`;
    }
    catch {
        return url;
    }
}
/**
 * ดึง Hostname จาก Connection URL
 */
export function extractHostFromUrl(url) {
    if (!url)
        return 'Unknown';
    try {
        const atIndex = url.lastIndexOf('@');
        if (atIndex !== -1) {
            const rest = url.substring(atIndex + 1);
            const match = rest.match(/^([^:/]+)(?::(\d+))?(?:\/([^?]+))?/);
            if (match) {
                const host = match[1];
                const port = match[2] || '5432';
                const db = match[3] || 'postgres';
                return `${host}:${port} (${db})`;
            }
        }
        return url.includes('localhost') ? 'localhost:5432 (formlocal_db)' : 'Cloud Database';
    }
    catch {
        return 'Unknown Host';
    }
}
/**
 * ทดสอบ Ping ไปยังฐานข้อมูล
 */
export async function pingDatabase(url) {
    if (!url || !url.startsWith('postgres')) {
        return { ok: false, error: 'Connection string ไม่ถูกต้อง กรุณาระบุ postgresql://...' };
    }
    const testClient = new PrismaClient({
        datasources: {
            db: { url },
        },
        log: ['error'],
    });
    const start = Date.now();
    try {
        await testClient.$queryRaw `SELECT 1`;
        const latencyMs = Date.now() - start;
        await testClient.$disconnect();
        return { ok: true, latencyMs };
    }
    catch (err) {
        try {
            await testClient.$disconnect();
        }
        catch { }
        return {
            ok: false,
            error: err.message || 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบ Network หรือ Connection String',
        };
    }
}
const DEFAULT_SUPABASE_URL = 'postgresql://postgres.pgokdsqumwbitqtptuom:ram2Ram2@10666@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';
/**
 * ตรวจสอบสถานะการเชื่อมต่อฐานข้อมูลปัจจุบัน
 */
export async function getDbStatus() {
    const activeDb = 'SUPABASE';
    const currentUrl = process.env.DATABASE_URL || DEFAULT_SUPABASE_URL;
    const pingResult = await pingDatabase(currentUrl);
    return {
        activeDb,
        currentHost: extractHostFromUrl(currentUrl),
        isSupabaseConfigured: true,
        maskedSupabaseUrl: maskDatabaseUrl(currentUrl),
        hasLocalConfigured: false,
        isConnected: pingResult.ok,
        latencyMs: pingResult.latencyMs ?? null,
        error: pingResult.error,
    };
}
/**
 * สลับการเชื่อมต่อระหว่าง LOCAL และ SUPABASE
 */
export async function switchDatabaseTarget(target, newSupabaseUrl) {
    // อ่านไฟล์ .env ปัจจุบัน (หากมี)
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
        try {
            envContent = fs.readFileSync(ENV_PATH, 'utf-8');
        }
        catch { }
    }
    let localUrl = process.env.DATABASE_URL_LOCAL || 'postgresql://postgres:ram2%231234@localhost:5432/formlocal_db?schema=public';
    let supabaseUrl = newSupabaseUrl?.trim() || process.env.DATABASE_URL_SUPABASE || '';
    let targetUrl = target === 'LOCAL' ? localUrl : supabaseUrl;
    if (target === 'SUPABASE' && (!targetUrl || targetUrl.trim().length < 15)) {
        throw new Error('กรุณากรอก Supabase Connection String ก่อนทำการสลับการเชื่อมต่อ');
    }
    // 1. ทดสอบการเชื่อมต่อปลายทางก่อนสลับจริง
    const test = await pingDatabase(targetUrl);
    if (!test.ok) {
        throw new Error(`ไม่สามารถเชื่อมต่อไปยัง ${target === 'LOCAL' ? 'Local PostgreSQL' : 'Supabase'} ได้: ${test.error}`);
    }
    // 2. อัปเดต .env
    // อัปเดต ACTIVE_DB
    if (/ACTIVE_DB=.*(\r?\n|$)/.test(envContent)) {
        envContent = envContent.replace(/ACTIVE_DB=.*(\r?\n|$)/, `ACTIVE_DB="${target}"$1`);
    }
    else {
        envContent += `\nACTIVE_DB="${target}"`;
    }
    // อัปเดต DATABASE_URL_SUPABASE หากมีค่าใหม่
    if (newSupabaseUrl && newSupabaseUrl.trim()) {
        if (/DATABASE_URL_SUPABASE=.*(\r?\n|$)/.test(envContent)) {
            envContent = envContent.replace(/DATABASE_URL_SUPABASE=.*(\r?\n|$)/, `DATABASE_URL_SUPABASE="${supabaseUrl}"$1`);
        }
        else {
            envContent += `\nDATABASE_URL_SUPABASE="${supabaseUrl}"`;
        }
    }
    // อัปเดต DATABASE_URL สำหรับ Prisma
    if (/DATABASE_URL=.*(\r?\n|$)/.test(envContent)) {
        envContent = envContent.replace(/DATABASE_URL=.*(\r?\n|$)/, `DATABASE_URL="${targetUrl}"$1`);
    }
    else {
        envContent += `\nDATABASE_URL="${targetUrl}"`;
    }
    fs.writeFileSync(ENV_PATH, envContent, 'utf-8');
    // อัปเดต process.env
    process.env.ACTIVE_DB = target;
    if (newSupabaseUrl)
        process.env.DATABASE_URL_SUPABASE = supabaseUrl;
    process.env.DATABASE_URL = targetUrl;
    return {
        success: true,
        message: `สลับการเชื่อมต่อไปยัง ${target === 'LOCAL' ? 'Local PostgreSQL (เครื่อง Dev)' : 'Supabase Cloud'} สำเร็จเรียบร้อยแล้ว`,
        activeDb: target,
        latencyMs: test.latencyMs,
    };
}
