import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { createApp } from './bootstrap';
import { EnvService } from './infrastructure/config/env.service';

async function main() {
  const app = await createApp();
  const port = app.get(EnvService).get('PORT');
  await app.listen(port);
  new Logger('Bootstrap').log(`API ready on http://localhost:${port}/api/v1 · docs at /api/v1/docs`);
}

void main();
