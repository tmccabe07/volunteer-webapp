import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS to allow requests from our Next.js frontend
  app.enableCors({
    origin: 'http://localhost:3000', // The URL of the frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  //changed port of backend to 3001 to avoid conflict with frontend
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
