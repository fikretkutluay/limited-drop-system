import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';
import path from 'path';
const dbPath = path.resolve(process.cwd(), 'dev.db');
const adapter = new PrismaLibSql({
    url: `file:${dbPath}`
});
export const prisma = new PrismaClient({ adapter });
