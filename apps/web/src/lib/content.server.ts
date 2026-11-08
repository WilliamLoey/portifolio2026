import 'server-only';
import type {
  Locale,
  Paginated,
  PublicProfile,
  PublicProject,
  PublicProjectSummary,
  SitemapEntry,
  SitePayload,
} from '@portfolio/contracts';
import { serverEnv } from './env.server';

/** Every public page is tagged with this; the API's signed revalidation call purges it. */
export const CONTENT_TAG = 'content';

/** Safety net if a revalidation call is ever lost. */
const MAX_AGE_SECONDS = 3600;

async function publicGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${serverEnv().API_URL}${path}`, {
      next: { revalidate: MAX_AGE_SECONDS, tags: [CONTENT_TAG] },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`API ${response.status} on ${path}`);
    return (await response.json()) as T;
  } catch (error) {
    // API unreachable (cold build, outage): render the page's empty state instead of failing,
    // and let the next revalidation fill it in.
    console.error(`[content] ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

const EMPTY_SITE = (locale: Locale): SitePayload => ({
  locale,
  profile: null,
  featuredProjects: [],
  experience: [],
  education: [],
  technologies: [],
  categories: [],
  certifications: [],
  socialLinks: [],
});

export async function getSite(locale: Locale): Promise<SitePayload> {
  return (await publicGet<SitePayload>(`/site?locale=${locale}`)) ?? EMPTY_SITE(locale);
}

export async function getAllProjects(locale: Locale): Promise<PublicProjectSummary[]> {
  const page = await publicGet<Paginated<PublicProjectSummary>>(`/projects?locale=${locale}&pageSize=50`);
  return page?.items ?? [];
}

export function getProject(slug: string, locale: Locale): Promise<PublicProject | null> {
  return publicGet<PublicProject>(`/projects/${encodeURIComponent(slug)}?locale=${locale}`);
}

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  return (await publicGet<SitemapEntry[]>('/sitemap')) ?? [];
}

export type { PublicProfile };
