import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TournamentTestModule } from '../tournament-test.module';

let mongoMemoryServer: MongoMemoryServer;

export async function createE2eApp(): Promise<INestApplication> {
  mongoMemoryServer = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongoMemoryServer.getUri();
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_TOKEN_AUDIENCE = 'test-audience';
  process.env.JWT_TOKEN_ISSUER = 'test-issuer';
  process.env.JWT_TOKEN_TTL = '3600';
  process.env.JWT_REFRESH_TOKEN_TTL = '86400';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [TournamentTestModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

export async function cleanDatabase(app: INestApplication): Promise<void> {
  const connection = app.get<Connection>(getConnectionToken());
  await connection.dropDatabase();
}

export async function closeE2eApp(app: INestApplication): Promise<void> {
  const connection = app.get<Connection>(getConnectionToken());
  await connection.close();
  await app.close();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}
