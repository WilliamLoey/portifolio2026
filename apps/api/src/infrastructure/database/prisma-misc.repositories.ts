import { Injectable } from '@nestjs/common';
import type { Locale, Translations } from '@portfolio/contracts';
import { MediaAsset, Prisma } from '@prisma/client';
import { AdminUserRecord, ContactMessageRecord, MediaRecord, SessionRecord } from '../../domain/content';
import {
  AdminUserRepository,
  ContactMessageRepository,
  DashboardQueries,
  MediaRepository,
  NewContactMessage,
  NewMedia,
  RateLimiter,
  RateLimitResult,
  SessionRepository,
} from '../../domain/ports';
import { guard } from './prisma-errors';
import { PrismaService } from './prisma.service';

/* ── Media ── */

const toMedia = (row: MediaAsset): MediaRecord => ({ ...row, alt: row.alt as Translations<string> });

@Injectable()
export class PrismaMediaRepository extends MediaRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async list() {
    return (await this.prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } })).map(toMedia);
  }
  async findById(id: string) {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    return row ? toMedia(row) : null;
  }
  async findManyByIds(ids: string[]) {
    return (await this.prisma.mediaAsset.findMany({ where: { id: { in: ids } } })).map(toMedia);
  }
  async create(data: NewMedia) {
    return toMedia(await this.prisma.mediaAsset.create({ data: { ...data, alt: data.alt as Prisma.InputJsonValue } }));
  }
  update(id: string, data: Partial<NewMedia>) {
    return guard(
      async () =>
        toMedia(
          await this.prisma.mediaAsset.update({
            where: { id },
            data: { ...data, ...(data.alt && { alt: data.alt as Prisma.InputJsonValue }) },
          }),
        ),
      { notFound: 'Image not found' },
    );
  }
  async delete(id: string) {
    await guard(() => this.prisma.mediaAsset.delete({ where: { id } }), { notFound: 'Image not found' });
  }

  /** Counts drafts and published snapshots: a snapshot can still show an image the draft dropped. */
  async usageCounts(ids?: string[]) {
    const filter = ids ? Prisma.sql`WHERE m.id = ANY(${ids})` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ id: string; usage: number }[]>`
      SELECT m.id,
        (SELECT count(*) FROM "Project" p WHERE p."coverId" = m.id OR p.published->>'coverId' = m.id)::int +
        (SELECT count(*) FROM "Profile" pr WHERE pr."photoId" = m.id OR pr.published->>'photoId' = m.id)::int
        AS usage
      FROM "MediaAsset" m ${filter}`;
    return new Map(rows.map((r) => [r.id, Number(r.usage)]));
  }
}

/* ── Contact messages ── */

type MessageRow = Prisma.ContactMessageGetPayload<object>;
const toMessage = (row: MessageRow): ContactMessageRecord => ({ ...row, locale: row.locale as Locale });

@Injectable()
export class PrismaContactMessageRepository extends ContactMessageRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async create(data: NewContactMessage) {
    return toMessage(await this.prisma.contactMessage.create({ data }));
  }
  async markDelivered(id: string, at: Date) {
    await this.prisma.contactMessage.update({ where: { id }, data: { deliveredAt: at } });
  }
  async page({ page, pageSize, unreadOnly }: { page: number; pageSize: number; unreadOnly: boolean }) {
    const where = unreadOnly ? { readAt: null } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map(toMessage), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
  setRead(id: string, readAt: Date | null) {
    return guard(async () => toMessage(await this.prisma.contactMessage.update({ where: { id }, data: { readAt } })), {
      notFound: 'Message not found',
    });
  }
  async delete(id: string) {
    await guard(() => this.prisma.contactMessage.delete({ where: { id } }), { notFound: 'Message not found' });
  }
}

/* ── Admin users & sessions ── */

@Injectable()
export class PrismaAdminUserRepository extends AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  findByEmail(email: string): Promise<AdminUserRecord | null> {
    return this.prisma.adminUser.findUnique({ where: { email } });
  }
  findById(id: string): Promise<AdminUserRecord | null> {
    return this.prisma.adminUser.findUnique({ where: { id } });
  }
  create(data: Omit<AdminUserRecord, 'id'>): Promise<AdminUserRecord> {
    return guard(() => this.prisma.adminUser.create({ data }), { unique: 'That email already has an account' });
  }
  async updatePassword(id: string, passwordHash: string) {
    await this.prisma.adminUser.update({ where: { id }, data: { passwordHash } });
  }
  async touchLogin(id: string, at: Date) {
    await this.prisma.adminUser.update({ where: { id }, data: { lastLoginAt: at } });
  }
}

const sessionSelect = {
  id: true,
  userId: true,
  expiresAt: true,
  lastSeenAt: true,
  user: { select: { id: true, email: true, name: true } },
} as const;

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  create(data: { userId: string; tokenHash: string; expiresAt: Date; ipHash: string | null; userAgent: string | null }): Promise<SessionRecord> {
    return this.prisma.session.create({ data, select: sessionSelect });
  }
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return this.prisma.session.findUnique({ where: { tokenHash }, select: sessionSelect });
  }
  async touch(id: string, at: Date) {
    await this.prisma.session.updateMany({ where: { id }, data: { lastSeenAt: at } });
  }
  async delete(id: string) {
    await this.prisma.session.deleteMany({ where: { id } });
  }
  async deleteForUser(userId: string, exceptSessionId?: string) {
    await this.prisma.session.deleteMany({ where: { userId, ...(exceptSessionId && { id: { not: exceptSessionId } }) } });
  }
  async deleteExpired(now: Date) {
    return (await this.prisma.session.deleteMany({ where: { expiresAt: { lte: now } } })).count;
  }
}

/* ── Rate limiting (fixed window, atomic upsert) ── */

@Injectable()
export class PostgresRateLimiter extends RateLimiter {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const [row] = await this.prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "RateLimitBucket"."resetAt" END
      RETURNING "count", "resetAt"`;

    // Occasional cleanup keeps the table tiny without a cron job.
    if (Math.random() < 0.02) {
      await this.prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "resetAt" < now() - interval '1 day'`;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((new Date(row!.resetAt).getTime() - Date.now()) / 1000));
    return { allowed: row!.count <= limit, retryAfterSeconds };
  }
}

/* ── Dashboard counts ── */

@Injectable()
export class PrismaDashboardQueries extends DashboardQueries {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async overview(now: Date) {
    const since = new Date(now.getTime() - 30 * 86_400_000);
    const [total, unread, recent, undelivered, media, experience, education, technologies] = await Promise.all([
      this.prisma.contactMessage.count(),
      this.prisma.contactMessage.count({ where: { readAt: null } }),
      this.prisma.contactMessage.count({ where: { createdAt: { gte: since } } }),
      this.prisma.contactMessage.count({ where: { deliveredAt: null } }),
      this.prisma.mediaAsset.aggregate({ _count: true, _sum: { bytes: true } }),
      this.prisma.experience.count(),
      this.prisma.education.count(),
      this.prisma.technology.count(),
    ]);
    return {
      messages: { total, unread, last30Days: recent, undelivered },
      media: { count: media._count, bytes: media._sum.bytes ?? 0 },
      content: { experience, education, technologies },
    };
  }
}
