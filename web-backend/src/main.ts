import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  // If using wildcard origin, do not enable credentials to satisfy CORS spec
  const useCredentials = corsOrigin !== '*';
  app.enableCors({
    origin: corsOrigin,
    credentials: useCredentials,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global API prefix so that Nginx /api proxy works
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`✓ Application is running on: http://localhost:${port}/api`);
}

bootstrap();

