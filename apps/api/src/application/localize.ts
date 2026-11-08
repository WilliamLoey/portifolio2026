import {
  DEFAULT_LOCALE,
  LOCALES,
  Locale,
  PublicEducation,
  PublicExperience,
  PublicImage,
  PublicProfile,
  PublicProject,
  Translations,
  translatedLocales,
} from '@portfolio/contracts';
import type {
  CategoryRecord,
  EducationDraft,
  ExperienceDraft,
  MediaRecord,
  ProfileSnapshot,
  ProjectSnapshot,
  TechnologyRecord,
} from '../domain/content';

/** Requested language if written, otherwise English, otherwise whatever exists. */
export function pickTranslation<T>(translations: Translations<T>, locale: Locale): { value: T; locale: Locale } {
  const order: Locale[] = [locale, DEFAULT_LOCALE, ...LOCALES];
  for (const candidate of order) {
    const value = translations[candidate];
    if (value !== undefined) return { value, locale: candidate };
  }
  throw new Error('Content has no translation at all');
}

/** Lookups needed to turn stored ids into public objects. */
export interface ReferenceContext {
  media: Map<string, MediaRecord>;
  technologies: Map<string, TechnologyRecord>;
  categories: Map<string, CategoryRecord>;
}

export function toPublicImage(media: MediaRecord | undefined, locale: Locale, fallbackAlt: string): PublicImage | null {
  if (!media) return null;
  const alt = media.alt[locale] ?? media.alt[DEFAULT_LOCALE] ?? fallbackAlt;
  return { url: media.url, width: media.width, height: media.height, alt };
}

export interface ProjectLiveFields {
  featured: boolean;
  publishedAt: Date;
  updatedAt: Date;
}

export function localizeProject(
  snapshot: ProjectSnapshot,
  live: ProjectLiveFields,
  ctx: ReferenceContext,
  locale: Locale,
): PublicProject {
  const { value: t, locale: contentLocale } = pickTranslation(snapshot.translations, locale);
  const category = snapshot.categoryId ? ctx.categories.get(snapshot.categoryId) : undefined;

  return {
    slug: snapshot.slug,
    title: t.title,
    summary: t.summary,
    body: t.body,
    role: t.role,
    outcome: t.outcome,
    year: snapshot.year,
    cover: toPublicImage(snapshot.coverId ? ctx.media.get(snapshot.coverId) : undefined, locale, t.title),
    category: category
      ? { slug: category.slug, name: pickTranslation(category.translations, locale).value.name }
      : null,
    technologies: snapshot.technologyIds
      .map((id) => ctx.technologies.get(id))
      .filter((tech): tech is TechnologyRecord => tech !== undefined)
      .map(({ slug, name, group }) => ({ slug, name, group })),
    repoUrl: snapshot.repoUrl,
    liveUrl: snapshot.liveUrl,
    featured: live.featured,
    contentLocale,
    publishedAt: live.publishedAt.toISOString(),
    updatedAt: live.updatedAt.toISOString(),
    availableLocales: translatedLocales(snapshot.translations),
  };
}

export function localizeProfile(snapshot: ProfileSnapshot, ctx: Pick<ReferenceContext, 'media'>, locale: Locale): PublicProfile {
  const { value: t, locale: contentLocale } = pickTranslation(snapshot.translations, locale);
  return {
    fullName: snapshot.fullName,
    email: snapshot.email,
    location: snapshot.location,
    timezone: snapshot.timezone,
    openToWork: snapshot.openToWork,
    resumeUrl: snapshot.resumeUrl,
    spokenLanguages: snapshot.spokenLanguages,
    photo: toPublicImage(
      snapshot.photoId ? ctx.media.get(snapshot.photoId) : undefined,
      locale,
      `Portrait of ${snapshot.fullName}`,
    ),
    role: t.role,
    headline: t.headline,
    bio: t.bio,
    availability: t.availability,
    contentLocale,
  };
}

export function localizeExperience(id: string, snapshot: ExperienceDraft, locale: Locale): PublicExperience {
  const { value: t, locale: contentLocale } = pickTranslation(snapshot.translations, locale);
  return {
    id,
    company: snapshot.company,
    companyUrl: snapshot.companyUrl,
    location: snapshot.location,
    employmentType: snapshot.employmentType,
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
    role: t.role,
    summary: t.summary,
    highlights: t.highlights,
    contentLocale,
  };
}

export function localizeEducation(id: string, snapshot: EducationDraft, locale: Locale): PublicEducation {
  const { value: t, locale: contentLocale } = pickTranslation(snapshot.translations, locale);
  return {
    id,
    institution: snapshot.institution,
    url: snapshot.url,
    startYear: snapshot.startYear,
    endYear: snapshot.endYear,
    status: snapshot.status,
    degree: t.degree,
    field: t.field,
    notes: t.notes,
    contentLocale,
  };
}

/** Current roles first, then most recent start date. */
export function compareExperience(a: ExperienceDraft, b: ExperienceDraft): number {
  if ((a.endDate === null) !== (b.endDate === null)) return a.endDate === null ? -1 : 1;
  if (a.startDate !== b.startDate) return a.startDate < b.startDate ? 1 : -1;
  return 0;
}

/** In-progress first, then most recent. */
export function compareEducation(a: EducationDraft, b: EducationDraft): number {
  const endA = a.endYear ?? Number.MAX_SAFE_INTEGER;
  const endB = b.endYear ?? Number.MAX_SAFE_INTEGER;
  if (endA !== endB) return endB - endA;
  return b.startYear - a.startYear;
}
