import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip undefined properties
    forbidNonWhitelisted: true, // Reject unknown properties
    transform: true, // Transform to DTO types
    transformOptions: { enableImplicitConversion: true }, // Handle type conversions
    stopAtFirstError: false, // Return all validation errors
  }));
  await app.listen(process.env.PORT || 3000);
}
bootstrap();