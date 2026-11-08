import { Injectable } from '@nestjs/common';
import type { Locale } from '@portfolio/contracts';
import { Prisma } from '@prisma/client';
import { EducationDraft, EducationRecord, ExperienceDraft, ExperienceRecord } from '../../domain/content';
import { EducationRepository, ExperienceRepository } from '../../domain/ports';
import { guard, isPublished, jsonOrNull } from './prisma-errors';
import { PrismaService } from './prisma.service';

/* ── Experience ── */

type ExperienceRow = Prisma.ExperienceGetPayload<{ include: { translations: true } }>;

function toExperience(row: ExperienceRow): ExperienceRecord {
  const translations: ExperienceDraft['translations'] = {};
  for (const t of row.translations) {
    translations[t.locale as Locale] = { role: t.role, summary: t.summary, highlights: t.highlights };
  }
  return {
    id: row.id,
    draft: {
      company: row.company,
      companyUrl: row.companyUrl,
      location: row.location,
      employmentType: row.employmentType as ExperienceDraft['employmentType'],
      startDate: row.startDate,
      endDate: row.endDate,
      translations,
    },
    snapshot: row.published as ExperienceDraft | null,
    publishedAt: row.publishedAt,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const experienceData = ({ translations, ...fields }: ExperienceDraft) => ({
  ...fields,
  translations: { create: Object.entries(translations).map(([locale, t]) => ({ locale, ...t! })) },
});

@Injectable()
export class PrismaExperienceRepository extends ExperienceRepository {
  private readonly notFound = { notFound: 'Experience entry not found' };

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list() {
    return (await this.prisma.experience.findMany({ include: { translations: true } })).map(toExperience);
  }

  async listPublished() {
    return (await this.prisma.experience.findMany({ where: isPublished, include: { translations: true } })).map(toExperience);
  }

  async findById(id: string) {
    const row = await this.prisma.experience.findUnique({ where: { id }, include: { translations: true } });
    return row ? toExperience(row) : null;
  }

  async create(draft: ExperienceDraft) {
    return toExperience(await this.prisma.experience.create({ data: experienceData(draft), include: { translations: true } }));
  }

  update(id: string, draft: ExperienceDraft) {
    return guard(async () => {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.experienceTranslation.deleteMany({ where: { experienceId: id } });
        return tx.experience.update({ where: { id }, data: experienceData(draft), include: { translations: true } });
      });
      return toExperience(row);
    }, this.notFound);
  }

  setPublication(id: string, snapshot: ExperienceDraft | null, at: Date | null) {
    return guard(async () => {
      const row = await this.prisma.experience.update({
        where: { id },
        data: { published: jsonOrNull(snapshot), publishedAt: at },
        include: { translations: true },
      });
      return toExperience(row);
    }, this.notFound);
  }

  async delete(id: string) {
    await guard(() => this.prisma.experience.delete({ where: { id } }), this.notFound);
  }
}

/* ── Education ── */

type EducationRow = Prisma.EducationGetPayload<{ include: { translations: true } }>;

function toEducation(row: EducationRow): EducationRecord {
  const translations: EducationDraft['translations'] = {};
  for (const t of row.translations) {
    translations[t.locale as Locale] = { degree: t.degree, field: t.field, notes: t.notes };
  }
  return {
    id: row.id,
    draft: {
      institution: row.institution,
      url: row.url,
      startYear: row.startYear,
      endYear: row.endYear,
      status: row.status as EducationDraft['status'],
      translations,
    },
    snapshot: row.published as EducationDraft | null,
    publishedAt: row.publishedAt,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const educationData = ({ translations, ...fields }: EducationDraft) => ({
  ...fields,
  translations: { create: Object.entries(translations).map(([locale, t]) => ({ locale, ...t! })) },
});

@Injectable()
export class PrismaEducationRepository extends EducationRepository {
  private readonly notFound = { notFound: 'Education entry not found' };

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list() {
    return (await this.prisma.education.findMany({ include: { translations: true } })).map(toEducation);
  }

  async listPublished() {
    return (await this.prisma.education.findMany({ where: isPublished, include: { translations: true } })).map(toEducation);
  }

  async findById(id: string) {
    const row = await this.prisma.education.findUnique({ where: { id }, include: { translations: true } });
    return row ? toEducation(row) : null;
  }

  async create(draft: EducationDraft) {
    return toEducation(await this.prisma.education.create({ data: educationData(draft), include: { translations: true } }));
  }

  update(id: string, draft: EducationDraft) {
    return guard(async () => {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.educationTranslation.deleteMany({ where: { educationId: id } });
        return tx.education.update({ where: { id }, data: educationData(draft), include: { translations: true } });
      });
      return toEducation(row);
    }, this.notFound);
  }

  setPublication(id: string, snapshot: EducationDraft | null, at: Date | null) {
    return guard(async () => {
      const row = await this.prisma.education.update({
        where: { id },
        data: { published: jsonOrNull(snapshot), publishedAt: at },
        include: { translations: true },
      });
      return toEducation(row);
    }, this.notFound);
  }

  async delete(id: string) {
    await guard(() => this.prisma.education.delete({ where: { id } }), this.notFound);
  }
}
