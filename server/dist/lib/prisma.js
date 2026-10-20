import { PrismaClient } from '@prisma/client';
const DEFAULT_SUPABASE_URL = 'postgresql://postgres.pgokdsqumwbitqtptuom:ram2Ram2@10666@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';
const databaseUrl = process.env.DATABASE_URL || DEFAULT_SUPABASE_URL;
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        datasources: {
            db: {
                url: databaseUrl,
            },
        },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
// Always reuse PrismaClient instance across warm lambdas / serverless functions
globalForPrisma.prisma = prisma;
