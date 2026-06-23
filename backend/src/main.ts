/**
 * NestJS Application Bootstrap
 * 
 * Initializes the application with middleware, global filters, and configuration
 * per plan.md and research.md
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { sanitizationMiddleware } from './middleware/sanitize';

function isLoopbackIp(ip?: string): boolean {
  if (!ip) {
    return false;
  }

  const normalized = ip.replace('::ffff:', '').toLowerCase();
  return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: Helmet middleware for HTTP headers
  app.use(helmet());

  // CORS: Allow requests from Next.js frontend
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL environment variable is required in production');
  }
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies to be sent
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Cookie parser for JWT tokens in HttpOnly cookies
  app.use(cookieParser());

  // Input sanitization for request bodies, params, and queries
  app.use(sanitizationMiddleware);

  // Global rate limiting (environment-aware)
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Only apply rate limiting in production
  if (!isDevelopment) {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
      legacyHeaders: false, // Disable `X-RateLimit-*` headers
      skip: (req) => isLoopbackIp(req.ip),
    });
    app.use(limiter);
    console.log('🔒 Rate limiting enabled (100 requests per 15 minutes)');
  } else {
    console.log('⚠️  Rate limiting disabled in development mode');
  }

  // Global prefix for all routes (/api)
  app.setGlobalPrefix('api');

  // Start server
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Backend server running on http://localhost:${port}/api`);
  console.log(`📊 Database: ${process.env.DATABASE_URL || 'file:./dev.db'}`);
  console.log(`🌐 CORS enabled for: ${frontendUrl}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
