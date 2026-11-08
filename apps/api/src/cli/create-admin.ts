/**
 * Creates the dashboard account.
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 * The password is read from ADMIN_PASSWORD, or asked for interactively (input hidden).
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { parseArgs } from 'node:util';
import { AppModule } from '../app.module';
import { AuthService } from '../application/auth.service';

function askHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, done) {
      if (!muted) process.stdout.write(chunk);
      done();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' } } });
  if (!values.email || !values.name) {
    console.error('Usage: npm run admin:create -- --email you@example.com --name "Your Name"');
    process.exit(1);
  }
  const password = process.env.ADMIN_PASSWORD ?? (await askHidden('Password (min. 12 characters): '));

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const user = await app.get(AuthService).createAdmin(values.email, values.name, password);
    console.log(`Created admin ${user.email}. Sign in at /dashboard/login.`);
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
