import 'dotenv/config';
import { getDbStatus, switchDatabaseTarget, pingDatabase, DatabaseTarget } from '../src/utils/dbManager.js';

async function main() {
  const arg = (process.argv[2] || '').trim().toUpperCase();

  if (arg === 'STATUS') {
    console.log('\n🔍 กำลังตรวจสอบสถานะการเชื่อมต่อฐานข้อมูล...');
    const status = await getDbStatus();
    console.log('----------------------------------------------------');
    console.log(`📡 ฐานข้อมูลที่ใช้งานอยู่:  ${status.activeDb === 'LOCAL' ? '🟢 Local PostgreSQL (เครื่องนี้)' : '☁️ Supabase Cloud'}`);
    console.log(`🌐 Host:                 ${status.currentHost}`);
    console.log(`⚡ สถานะการเชื่อมต่อ:      ${status.isConnected ? '✅ ปกติ (Connected)' : '❌ ขัดข้อง (Disconnected)'}`);
    if (status.latencyMs !== null) {
      console.log(`⏱️ Latency:              ${status.latencyMs} ms`);
    }
    if (status.error) {
      console.log(`⚠️ ข้อผิดพลาด:            ${status.error}`);
    }
    console.log(`☁️ Supabase URL ตั้งค่าแล้ว: ${status.isSupabaseConfigured ? 'มี (' + status.maskedSupabaseUrl + ')' : 'ยังไม่ได้ระบุ'}`);
    console.log('----------------------------------------------------\n');
    return;
  }

  if (arg === 'LOCAL' || arg === 'SUPABASE') {
    const target = arg as DatabaseTarget;
    console.log(`\n🔄 กำลังดำเนินการสลับการเชื่อมต่อไปยัง: ${target}...`);
    try {
      const res = await switchDatabaseTarget(target);
      console.log(`✅ ${res.message} (ความเร็ว: ${res.latencyMs} ms)`);
      console.log('💡 ระบบ server (tsx watch) จะรีโหลดการเชื่อมต่อใหม่อัตโนมัติ');
    } catch (err: any) {
      console.error(`❌ เกิดข้อผิดพลาด: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  console.log('\n📌 วิธีใช้งานคำสั่งสลับฐานข้อมูล:');
  console.log('  npm run db:status          - ตรวจสอบสถานะและ ping ฐานข้อมูลปัจจุบัน');
  console.log('  npm run db:local           - สลับไปใช้ Local PostgreSQL บนเครื่อง');
  console.log('  npm run db:supabase        - สลับไปใช้ Supabase Cloud PostgreSQL');
  console.log('----------------------------------------------------\n');
}

main().catch(console.error);
