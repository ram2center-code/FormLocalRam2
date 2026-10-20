import { prisma } from '../src/lib/prisma.js';

async function main() {
  const tables = await prisma.$queryRawUnsafe<any[]>(
    `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
  );
  console.log('Tables and RLS status:');
  console.table(tables);
}

main().catch(console.error).finally(() => process.exit(0));
