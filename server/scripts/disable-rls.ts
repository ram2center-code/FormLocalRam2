import { prisma } from '../src/lib/prisma.js';

const tables = [
  'Department',
  'User',
  'Form',
  'FormVersion',
  'FormShare',
  'FormAssignment',
  'Submission',
  'AuditLog',
];

async function main() {
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
      console.log(`✅ Disabled RLS on "${table}"`);
    } catch (e: any) {
      console.error(`Error on "${table}":`, e.message);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
