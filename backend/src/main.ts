/**
 * NestJS Application Bootstrap
 * 
 * Initializes the application with middleware, global filters, and configuration
 * per plan.md and research.md
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: Helmet middleware for HTTP headers
  app.use(helmet());

  // CORS: Allow requests from Next.js frontend
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies to be sent
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Cookie parser for JWT tokens in HttpOnly cookies
  app.use(cookieParser());

  // Global rate limiting (100 requests per 15 minutes per IP)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
  });
  app.use(limiter);

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
