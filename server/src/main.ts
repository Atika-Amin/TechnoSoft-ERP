import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Every route starts with /api  →  e.g. POST /api/auth/login
  app.setGlobalPrefix('api');

  // Allow the React app (a different port) to call this API
  app.enableCors({ origin: config.get('CLIENT_URL', 'http://localhost:5173') });

  // Run class-validator rules on every incoming DTO.
  // whitelist: strip fields that aren't declared in the DTO
  // transform: turn plain JSON into DTO class instances (and "100" → 100 where @Type is used)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}
await bootstrap();
