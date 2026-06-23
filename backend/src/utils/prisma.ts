/**
 * Prisma Client Singleton
 * 
 * Single instance of PrismaClient for database connection management
 * per research.md best practices
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

/**
 * Extended PrismaClient with custom configuration
 * 
 * Note: Prisma 7 no longer supports middleware ($use). 
 * Soft delete logic should be implemented at the service layer.
 */
const prismaClientSingleton = () => {
  // Initialize Prisma with libSQL adapter for SQLite support (Prisma 7)
  const dbUrl = process.env.DATABASE_URL || (process.env.NODE_ENV === 'production' ? null : 'file:./dev.db');
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required in production');
  }
  const adapter = new PrismaLibSql({
    url: dbUrl,
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  });

  const prisma = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  return prisma;
};

// Singleton pattern for development with hot reloading
declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Gracefully disconnect from database on shutdown
 */
export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
};
