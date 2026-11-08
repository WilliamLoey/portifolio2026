import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { EnvService } from './infrastructure/config/env.service';

/** Shared by main.ts (server), the Vercel entry point and the integration tests. */
export async function createApp(options: { logger?: false } = {}): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    ...(options.logger === false && { logger: false }),
  });
  const env = app.get(EnvService);

  if (env.get('TRUST_PROXY') > 0) app.set('trust proxy', env.get('TRUST_PROXY'));
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Images (local storage) are embedded by the website on another origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // JSON API: nothing should ever be rendered or framed.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    }),
  );
  app.enableCors({
    origin: env.get('CORS_ORIGINS'),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: false,
    maxAge: 86_400,
  });
  app.useBodyParser('json', { limit: '256kb' });

  if (env.get('STORAGE_DRIVER') === 'local') {
    app.useStaticAssets(resolve(env.get('UPLOAD_DIR')), {
      prefix: '/uploads/',
      index: false,
      dotfiles: 'deny',
      maxAge: '30d',
      immutable: true,
    });
  }

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  return app;
}
