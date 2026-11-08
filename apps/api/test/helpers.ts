import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthService } from '../src/application/auth.service';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

export const ADMIN = { email: 'admin@example.com', password: 'integration-test-password' };

export async function startApp() {
  const app = await createApp({ logger: false });
  await app.init();
  await resetDatabase(app);
  await app.get(AuthService).createAdmin(ADMIN.email, 'Admin', ADMIN.password);
  return app;
}

/** Empties every table between test files (order respects foreign keys via CASCADE). */
export async function resetDatabase(app: INestApplication) {
  const prisma = app.get(PrismaService);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename::text AS tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);
}

export async function login(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send(ADMIN).expect(200);
  return response.body.token as string;
}

export const api = (app: INestApplication) => request(app.getHttpServer());
