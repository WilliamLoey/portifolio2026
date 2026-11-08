import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Integration tests run against a real PostgreSQL:
 *  • TEST_DATABASE_URL if set (CI uses a postgres service container),
 *  • otherwise an in-process PGlite server (PostgreSQL compiled to WASM) — no Docker needed.
 * Migrations are applied exactly as in production (prisma migrate deploy).
 */
export default async function globalSetup() {
  let url = process.env.TEST_DATABASE_URL;

  if (!url) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
    const db = await PGlite.create();
    const port = 5544 + Math.floor(Math.random() * 300);
    const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 20 });
    await server.start();
    (globalThis as Record<string, unknown>).__PGLITE__ = { db, server };
    url = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`;
  }

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: url,
    DIRECT_URL: url,
    DATABASE_POOL_MAX: process.env.TEST_DATABASE_URL ? '5' : '1',
    PUBLIC_API_URL: 'http://localhost:3333',
    CORS_ORIGINS: 'http://localhost:3000',
    IP_HASH_SALT: 'test-salt-0123456789abcdef0123456789abcdef',
    STORAGE_DRIVER: 'local',
    UPLOAD_DIR: mkdtempSync(join(tmpdir(), 'portfolio-uploads-')),
    MAIL_DRIVER: 'log',
    MAIL_FROM: 'Portfolio <test@example.com>',
    MAIL_TO: 'owner@example.com',
    WEB_REVALIDATE_URL: '',
    REVALIDATE_SECRET: '',
  });

  // Async on purpose: PGlite runs in this process and must keep answering while Prisma migrates.
  await promisify(exec)('npx prisma migrate deploy', { cwd: resolve(__dirname, '..'), env: process.env });
}
