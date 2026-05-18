/**
 * Jest setup file - runs BEFORE any tests
 * Sets environment variables to ensure tests use test.db instead of dev.db
 */

// IMPORTANT: Set DATABASE_URL before any imports that might create Prisma client
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';
