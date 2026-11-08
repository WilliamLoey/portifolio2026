import { Injectable } from '@nestjs/common';
import type { Locale } from '@portfolio/contracts';
import { Prisma } from '@prisma/client';
import { ProfileDraft, ProfileRecord, ProfileSnapshot } from '../../domain/content';
import { NotFoundError } from '../../domain/errors';
import { ProfileRepository } from '../../domain/ports';
import { guard, jsonOrNull } from './prisma-errors';
import { PrismaService } from './prisma.service';

const ID = 'main';
type Row = Prisma.ProfileGetPayload<{ include: { translations: true } }>;

function toRecord(row: Row): ProfileRecord {
  const translations: ProfileDraft['translations'] = {};
  for (const t of row.translations) {
    translations[t.locale as Locale] = {
      role: t.role,
      headline: t.headline,
      bio: t.bio,
      availability: t.availability,
    };
  }
  return {
    id: row.id,
    draft: {
      fullName: row.fullName,
      email: row.email,
      location: row.location,
      timezone: row.timezone,
      openToWork: row.openToWork,
      resumeUrl: row.resumeUrl,
      spokenLanguages: row.spokenLanguages as ProfileDraft['spokenLanguages'],
      photoId: row.photoId,
      translations,
    },
    snapshot: row.published as ProfileSnapshot | null,
    publishedAt: row.publishedAt,
    sortOrder: 0,
    createdAt: row.updatedAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaProfileRepository extends ProfileRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async get() {
    const row = await this.prisma.profile.findUnique({ where: { id: ID }, include: { translations: true } });
    return row ? toRecord(row) : null;
  }

  save({ translations, spokenLanguages, ...fields }: ProfileDraft) {
    return guard(async () => {
      const rows = Object.entries(translations).map(([locale, t]) => ({ locale, ...t! }));
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.profileTranslation.deleteMany({ where: { profileId: ID } });
        return tx.profile.upsert({
          where: { id: ID },
          create: { id: ID, ...fields, spokenLanguages, translations: { create: rows } },
          update: { ...fields, spokenLanguages, translations: { create: rows } },
          include: { translations: true },
        });
      });
      return toRecord(row);
    }, { foreignKey: 'The selected photo no longer exists' });
  }

  async setPublication(snapshot: ProfileSnapshot | null, at: Date | null) {
    const exists = await this.prisma.profile.count({ where: { id: ID } });
    if (!exists) throw new NotFoundError('The profile has not been created yet');
    const row = await this.prisma.profile.update({
      where: { id: ID },
      data: { published: jsonOrNull(snapshot), publishedAt: at },
      include: { translations: true },
    });
    return toRecord(row);
  }
}
