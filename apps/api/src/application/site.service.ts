import type {
  Locale,
  Paginated,
  PublicProject,
  PublicProjectSummary,
  PublicProjectsQuery,
  SitemapEntry,
  SitePayload,
} from '@portfolio/contracts';
import { translatedLocales } from '@portfolio/contracts';
import { ProjectRecord } from '../domain/content';
import { NotFoundError } from '../domain/errors';
import {
  CategoryRepository,
  CertificationRepository,
  EducationRepository,
  ExperienceRepository,
  MediaRepository,
  ProfileRepository,
  ProjectRepository,
  SocialLinkRepository,
  TechnologyRepository,
} from '../domain/ports';
import {
  compareEducation,
  compareExperience,
  localizeEducation,
  localizeExperience,
  localizeProfile,
  localizeProject,
  ReferenceContext,
} from './localize';

export const HOME_PROJECT_LIMIT = 6;

const toSummary = ({ body: _b, outcome: _o, publishedAt: _p, updatedAt: _u, availableLocales: _l, ...summary }: PublicProject): PublicProjectSummary =>
  summary;

/** Read side of the public website. Only published snapshots are ever read here. */
export class SiteService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly projects: ProjectRepository,
    private readonly experience: ExperienceRepository,
    private readonly education: EducationRepository,
    private readonly technologies: TechnologyRepository,
    private readonly categories: CategoryRepository,
    private readonly certifications: CertificationRepository,
    private readonly socialLinks: SocialLinkRepository,
    private readonly media: MediaRepository,
  ) {}

  async getSite(locale: Locale): Promise<SitePayload> {
    const [profile, projects, experience, education, certifications, socialLinks] = await Promise.all([
      this.profiles.get(),
      this.projects.listPublished(),
      this.experience.listPublished(),
      this.education.listPublished(),
      this.certifications.list(),
      this.socialLinks.list(),
    ]);
    const home = projects.filter((p) => p.draft.showOnHome).slice(0, HOME_PROJECT_LIMIT);
    const ctx = await this.loadContext([
      ...home.map((p) => p.snapshot!.coverId),
      profile?.snapshot?.photoId ?? null,
    ]);
    const categoriesInUse = new Set(projects.map((p) => p.snapshot!.categoryId).filter(Boolean));

    return {
      locale,
      profile: profile?.snapshot ? localizeProfile(profile.snapshot, ctx, locale) : null,
      featuredProjects: home.map((p) => toSummary(this.localize(p, ctx, locale))),
      experience: experience
        .sort((a, b) => compareExperience(a.snapshot!, b.snapshot!))
        .map((e) => localizeExperience(e.id, e.snapshot!, locale)),
      education: education
        .sort((a, b) => compareEducation(a.snapshot!, b.snapshot!))
        .map((e) => localizeEducation(e.id, e.snapshot!, locale)),
      technologies: [...ctx.technologies.values()]
        .filter((t) => t.featured)
        .map(({ slug, name, group }) => ({ slug, name, group })),
      categories: [...ctx.categories.values()]
        .filter((c) => categoriesInUse.has(c.id))
        .map((c) => ({ slug: c.slug, name: (c.translations[locale] ?? c.translations.en)!.name })),
      certifications: certifications
        .filter((c) => c.visible)
        .map(({ id, name, issuer, issuedOn, credentialId, credentialUrl }) => ({
          id, name, issuer, issuedOn, credentialId, credentialUrl,
        })),
      socialLinks: socialLinks.filter((l) => l.visible).map(({ kind, label, url }) => ({ kind, label, url })),
    };
  }

  async getProfile(locale: Locale) {
    const profile = await this.profiles.get();
    if (!profile?.snapshot) throw new NotFoundError('Profile not published');
    const ctx = await this.loadContext([profile.snapshot.photoId]);
    return localizeProfile(profile.snapshot, ctx, locale);
  }

  async listProjects(query: PublicProjectsQuery): Promise<Paginated<PublicProjectSummary>> {
    const all = await this.projects.listPublished();
    const ctx = await this.loadContext(all.map((p) => p.snapshot!.coverId));
    const category = query.category ? [...ctx.categories.values()].find((c) => c.slug === query.category) : undefined;
    const filtered = query.category ? all.filter((p) => category && p.snapshot!.categoryId === category.id) : all;

    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize).map((p) => toSummary(this.localize(p, ctx, query.locale))),
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / query.pageSize)),
    };
  }

  async getProject(slug: string, locale: Locale): Promise<PublicProject> {
    const project = await this.projects.findPublishedBySlug(slug);
    if (!project?.snapshot) throw new NotFoundError('Project not found');
    const ctx = await this.loadContext([project.snapshot.coverId]);
    return this.localize(project, ctx, locale);
  }

  /** Draft rendered exactly like the public page (preview mode). */
  async previewProject(project: ProjectRecord, locale: Locale): Promise<PublicProject> {
    const ctx = await this.loadContext([project.draft.coverId]);
    const draft = project.draft;
    return localizeProject(
      draft,
      { featured: draft.featured, publishedAt: project.publishedAt ?? project.updatedAt, updatedAt: project.updatedAt },
      ctx,
      locale,
    );
  }

  async sitemap(): Promise<SitemapEntry[]> {
    const projects = await this.projects.listPublished();
    return projects.map((p) => ({
      slug: p.snapshot!.slug,
      updatedAt: (p.publishedAt ?? p.updatedAt).toISOString(),
      locales: translatedLocales(p.snapshot!.translations),
    }));
  }

  private localize(project: ProjectRecord, ctx: ReferenceContext, locale: Locale): PublicProject {
    return localizeProject(
      project.snapshot!,
      { featured: project.draft.featured, publishedAt: project.publishedAt!, updatedAt: project.publishedAt! },
      ctx,
      locale,
    );
  }

  /** Technologies and categories are tiny tables: load them whole. Media only by id. */
  private async loadContext(mediaIds: (string | null)[]): Promise<ReferenceContext> {
    const ids = [...new Set(mediaIds.filter((id): id is string => Boolean(id)))];
    const [technologies, categories, media] = await Promise.all([
      this.technologies.list(),
      this.categories.list(),
      ids.length ? this.media.findManyByIds(ids) : Promise.resolve([]),
    ]);
    return {
      technologies: new Map(technologies.map((t) => [t.id, t])),
      categories: new Map(categories.map((c) => [c.id, c])),
      media: new Map(media.map((m) => [m.id, m])),
    };
  }
}
