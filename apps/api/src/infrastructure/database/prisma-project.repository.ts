import { Injectable } from '@nestjs/common';
import type { Locale, ProjectFlagsBody, Translations } from '@portfolio/contracts';
import { Prisma } from '@prisma/client';
import { ProjectDraft, ProjectRecord, ProjectSnapshot } from '../../domain/content';
import { ProjectRepository } from '../../domain/ports';
import { guard, isPublished, jsonOrNull } from './prisma-errors';
import { PrismaService } from './prisma.service';

const include = {
  translations: true,
  technologies: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProjectInclude;

type Row = Prisma.ProjectGetPayload<{ include: typeof include }>;

const messages = {
  unique: 'Another project already uses this URL slug',
  foreignKey: 'The selected category, cover image or technology no longer exists',
  notFound: 'Project not found',
};

function toRecord(row: Row): ProjectRecord {
  const translations: Translations<ProjectDraft['translations'][Locale] & object> = {};
  for (const t of row.translations) {
    translations[t.locale as Locale] = {
      title: t.title,
      summary: t.summary,
      body: t.body,
      role: t.role,
      outcome: t.outcome,
    };
  }
  return {
    id: row.id,
    draft: {
      slug: row.slug,
      categoryId: row.categoryId,
      coverId: row.coverId,
      repoUrl: row.repoUrl,
      liveUrl: row.liveUrl,
      year: row.year,
      technologyIds: row.technologies.map((t) => t.technologyId),
      featured: row.featured,
      showOnHome: row.showOnHome,
      translations,
    },
    snapshot: row.published as ProjectSnapshot | null,
    publishedAt: row.publishedAt,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function scalars(draft: ProjectDraft) {
  return {
    slug: draft.slug,
    categoryId: draft.categoryId,
    coverId: draft.coverId,
    repoUrl: draft.repoUrl,
    liveUrl: draft.liveUrl,
    year: draft.year,
    featured: draft.featured,
    showOnHome: draft.showOnHome,
  };
}

function translationRows(draft: ProjectDraft) {
  return Object.entries(draft.translations).map(([locale, t]) => ({ locale, ...t! }));
}

@Injectable()
export class PrismaProjectRepository extends ProjectRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list() {
    const rows = await this.prisma.project.findMany({ include, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return rows.map(toRecord);
  }

  async listPublished() {
    const rows = await this.prisma.project.findMany({
      where: isPublished,
      include,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toRecord);
  }

  async findById(id: string) {
    const row = await this.prisma.project.findUnique({ where: { id }, include });
    return row ? toRecord(row) : null;
  }

  async findPublishedBySlug(slug: string) {
    const row = await this.prisma.project.findFirst({ where: { published: { path: ['slug'], equals: slug } }, include });
    return row ? toRecord(row) : null;
  }

  create(draft: ProjectDraft) {
    return guard(async () => {
      const max = await this.prisma.project.aggregate({ _max: { sortOrder: true } });
      const row = await this.prisma.project.create({
        data: {
          ...scalars(draft),
          sortOrder: (max._max.sortOrder ?? -1) + 1,
          translations: { create: translationRows(draft) },
          technologies: { create: draft.technologyIds.map((technologyId, sortOrder) => ({ technologyId, sortOrder })) },
        },
        include,
      });
      return toRecord(row);
    }, messages);
  }

  update(id: string, draft: ProjectDraft) {
    return guard(async () => {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.projectTranslation.deleteMany({ where: { projectId: id } });
        await tx.projectTechnology.deleteMany({ where: { projectId: id } });
        return tx.project.update({
          where: { id },
          data: {
            ...scalars(draft),
            translations: { create: translationRows(draft) },
            technologies: { create: draft.technologyIds.map((technologyId, sortOrder) => ({ technologyId, sortOrder })) },
          },
          include,
        });
      });
      return toRecord(row);
    }, messages);
  }

  setPublication(id: string, snapshot: ProjectSnapshot | null, at: Date | null) {
    return guard(async () => {
      const row = await this.prisma.project.update({
        where: { id },
        data: { published: jsonOrNull(snapshot), publishedAt: at },
        include,
      });
      return toRecord(row);
    }, messages);
  }

  setFlags(id: string, flags: ProjectFlagsBody) {
    return guard(async () => toRecord(await this.prisma.project.update({ where: { id }, data: flags, include })), messages);
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, sortOrder) => this.prisma.project.updateMany({ where: { id }, data: { sortOrder } })),
    );
  }

  async delete(id: string) {
    await guard(() => this.prisma.project.delete({ where: { id } }), messages);
  }
}
