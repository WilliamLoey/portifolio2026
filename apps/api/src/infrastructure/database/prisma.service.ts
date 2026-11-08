import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { EnvService } from '../config/env.service';

/**
 * Rust-free Prisma Client over the `pg` driver adapter (engineType = "client"):
 * no native query engine to ship, which keeps the Vercel Function small and cold starts fast.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(env: EnvService) {
    super({ adapter: new PrismaPg({ connectionString: env.get('DATABASE_URL'), max: env.get('DATABASE_POOL_MAX') }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
