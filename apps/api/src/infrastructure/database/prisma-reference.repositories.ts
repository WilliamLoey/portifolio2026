import { Injectable } from '@nestjs/common';
import type {
  CategoryInput,
  CertificationInput,
  Locale,
  SocialLinkInput,
  TechnologyInput,
} from '@portfolio/contracts';
import {
  CategoryRecord,
  CertificationRecord,
  SocialLinkRecord,
  TechnologyRecord,
} from '../../domain/content';
import {
  CategoryRepository,
  CertificationRepository,
  SocialLinkRepository,
  TechnologyRepository,
} from '../../domain/ports';
import { guard } from './prisma-errors';
import { PrismaService } from './prisma.service';

type Delegate = {
  updateMany(args: { where: { id: string }; data: { sortOrder: number } }): Promise<unknown>;
  aggregate(args: { _max: { sortOrder: true } }): Promise<{ _max: { sortOrder: number | null } }>;
};

async function nextSortOrder(delegate: Delegate): Promise<number> {
  const max = await delegate.aggregate({ _max: { sortOrder: true } });
  return (max._max.sortOrder ?? -1) + 1;
}

async function reorder(prisma: PrismaService, delegate: Delegate, ids: string[]) {
  await prisma.$transaction(
    ids.map((id, sortOrder) => delegate.updateMany({ where: { id }, data: { sortOrder } }) as never),
  );
}

/* ── Technologies ── */

const techInclude = { _count: { select: { projects: true } } } as const;
type TechRow = { id: string; slug: string; name: string; group: string; featured: boolean; sortOrder: number; _count: { projects: number } };
const toTechnology = (row: TechRow): TechnologyRecord => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  group: row.group as TechnologyRecord['group'],
  featured: row.featured,
  sortOrder: row.sortOrder,
  projectCount: row._count.projects,
});

@Injectable()
export class PrismaTechnologyRepository extends TechnologyRepository {
  private readonly messages = { unique: 'A technology with this slug already exists', notFound: 'Technology not found' };
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async list() {
    const rows = await this.prisma.technology.findMany({ include: techInclude, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    return rows.map(toTechnology);
  }
  async findById(id: string) {
    const row = await this.prisma.technology.findUnique({ where: { id }, include: techInclude });
    return row ? toTechnology(row) : null;
  }
  create(input: TechnologyInput) {
    return guard(async () => {
      const sortOrder = await nextSortOrder(this.prisma.technology as unknown as Delegate);
      return toTechnology(await this.prisma.technology.create({ data: { ...input, sortOrder }, include: techInclude }));
    }, this.messages);
  }
  update(id: string, input: TechnologyInput) {
    return guard(async () => toTechnology(await this.prisma.technology.update({ where: { id }, data: input, include: techInclude })), this.messages);
  }
  async delete(id: string) {
    await guard(() => this.prisma.technology.delete({ where: { id } }), this.messages);
  }
  reorder(ids: string[]) {
    return reorder(this.prisma, this.prisma.technology as unknown as Delegate, ids);
  }
}

/* ── Categories ── */

const categoryInclude = { translations: true, _count: { select: { projects: true } } } as const;
type CategoryRow = {
  id: string;
  slug: string;
  sortOrder: number;
  translations: { locale: string; name: string }[];
  _count: { projects: number };
};
const toCategory = (row: CategoryRow): CategoryRecord => ({
  id: row.id,
  slug: row.slug,
  sortOrder: row.sortOrder,
  projectCount: row._count.projects,
  translations: Object.fromEntries(row.translations.map((t) => [t.locale as Locale, { name: t.name }])),
});
const categoryTranslations = (input: CategoryInput) =>
  Object.entries(input.translations).map(([locale, t]) => ({ locale, name: t!.name }));

@Injectable()
export class PrismaCategoryRepository extends CategoryRepository {
  private readonly messages = { unique: 'A category with this slug already exists', notFound: 'Category not found' };
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async list() {
    const rows = await this.prisma.category.findMany({ include: categoryInclude, orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }] });
    return rows.map(toCategory);
  }
  async findById(id: string) {
    const row = await this.prisma.category.findUnique({ where: { id }, include: categoryInclude });
    return row ? toCategory(row) : null;
  }
  create(input: CategoryInput) {
    return guard(async () => {
      const sortOrder = await nextSortOrder(this.prisma.category as unknown as Delegate);
      const row = await this.prisma.category.create({
        data: { slug: input.slug, sortOrder, translations: { create: categoryTranslations(input) } },
        include: categoryInclude,
      });
      return toCategory(row);
    }, this.messages);
  }
  update(id: string, input: CategoryInput) {
    return guard(async () => {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.categoryTranslation.deleteMany({ where: { categoryId: id } });
        return tx.category.update({
          where: { id },
          data: { slug: input.slug, translations: { create: categoryTranslations(input) } },
          include: categoryInclude,
        });
      });
      return toCategory(row);
    }, this.messages);
  }
  async delete(id: string) {
    await guard(() => this.prisma.category.delete({ where: { id } }), this.messages);
  }
  reorder(ids: string[]) {
    return reorder(this.prisma, this.prisma.category as unknown as Delegate, ids);
  }
}

/* ── Certifications ── */

@Injectable()
export class PrismaCertificationRepository extends CertificationRepository {
  private readonly messages = { notFound: 'Certification not found' };
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  list(): Promise<CertificationRecord[]> {
    return this.prisma.certification.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }
  findById(id: string): Promise<CertificationRecord | null> {
    return this.prisma.certification.findUnique({ where: { id } });
  }
  async create(input: CertificationInput) {
    const sortOrder = await nextSortOrder(this.prisma.certification as unknown as Delegate);
    return this.prisma.certification.create({ data: { ...input, sortOrder } });
  }
  update(id: string, input: CertificationInput) {
    return guard(() => this.prisma.certification.update({ where: { id }, data: input }), this.messages);
  }
  async delete(id: string) {
    await guard(() => this.prisma.certification.delete({ where: { id } }), this.messages);
  }
  reorder(ids: string[]) {
    return reorder(this.prisma, this.prisma.certification as unknown as Delegate, ids);
  }
}

/* ── Social links ── */

const toLink = (row: { id: string; kind: string; label: string; url: string; visible: boolean; sortOrder: number }): SocialLinkRecord => ({
  ...row,
  kind: row.kind as SocialLinkRecord['kind'],
});

@Injectable()
export class PrismaSocialLinkRepository extends SocialLinkRepository {
  private readonly messages = { notFound: 'Link not found' };
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async list() {
    return (await this.prisma.socialLink.findMany({ orderBy: { sortOrder: 'asc' } })).map(toLink);
  }
  async findById(id: string) {
    const row = await this.prisma.socialLink.findUnique({ where: { id } });
    return row ? toLink(row) : null;
  }
  async create(input: SocialLinkInput) {
    const sortOrder = await nextSortOrder(this.prisma.socialLink as unknown as Delegate);
    return toLink(await this.prisma.socialLink.create({ data: { ...input, sortOrder } }));
  }
  update(id: string, input: SocialLinkInput) {
    return guard(async () => toLink(await this.prisma.socialLink.update({ where: { id }, data: input })), this.messages);
  }
  async delete(id: string) {
    await guard(() => this.prisma.socialLink.delete({ where: { id } }), this.messages);
  }
  reorder(ids: string[]) {
    return reorder(this.prisma, this.prisma.socialLink as unknown as Delegate, ids);
  }
}
