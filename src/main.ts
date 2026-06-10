import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  /**
   * Global pipes for validation
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  /**
   * Swagger configuration
   */
  const config = new DocumentBuilder()
    .setTitle('Tournament Engine API')
    .setDescription('Backend API for World Cup 2026 Tournament Engine')
    .setVersion('1.0')
    .addServer(`http://localhost:${process.env.PORT ?? 3000}`, 'Localhost')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  /**
   * Enable CORS
   */
  app.enableCors();

  /**
   * Start the server
   */
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
