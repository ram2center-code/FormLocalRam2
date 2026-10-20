import { PrismaClient } from '@prisma/client';
const DEFAULT_SUPABASE_URL = 'postgresql://postgres.pgokdsqumwbitqtptuom:ram2Ram2@10666@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';
const globalForPrisma = globalThis;
export function getPrismaClient() {
    if (!globalForPrisma.prisma) {
        const databaseUrl = process.env.DATABASE_URL || DEFAULT_SUPABASE_URL;
        globalForPrisma.prisma = new PrismaClient({
            datasources: {
                db: {
                    url: databaseUrl,
                },
            },
            log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        });
    }
    return globalForPrisma.prisma;
}
export const prisma = new Proxy({}, {
    get(_target, prop) {
        const client = getPrismaClient();
        const value = client[prop];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    },
});
