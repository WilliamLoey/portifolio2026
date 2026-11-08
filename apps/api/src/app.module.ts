import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EnvModule } from './infrastructure/config/env.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { ServicesModule } from './infrastructure/services/services.module';
import { AppServicesModule } from './modules/app-services.module';
import { AdminCareerController } from './presentation/http/controllers/admin-career.controller';
import { AdminContentController } from './presentation/http/controllers/admin-content.controller';
import { AdminMediaController } from './presentation/http/controllers/admin-media.controller';
import { AdminReferenceController } from './presentation/http/controllers/admin-reference.controller';
import { AuthController } from './presentation/http/controllers/auth.controller';
import { DocsController } from './presentation/http/controllers/docs.controller';
import { PublicController } from './presentation/http/controllers/public.controller';
import { AllExceptionsFilter } from './presentation/http/support/exception.filters';
import { SessionGuard } from './presentation/http/support/session.guard';

@Module({
  imports: [
    EnvModule,
    // Per-instance safety net. Login and contact limits that must hold across
    // serverless instances live in PostgreSQL (see PostgresRateLimiter).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    DatabaseModule,
    ServicesModule,
    AppServicesModule,
  ],
  controllers: [
    PublicController,
    AuthController,
    AdminContentController,
    AdminCareerController,
    AdminReferenceController,
    AdminMediaController,
    DocsController,
  ],
  providers: [
    SessionGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
