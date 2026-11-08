import { z } from 'zod';
import { LOCALES, localeSchema } from './locales';
import { publicEducationSchema, publicExperienceSchema, SOCIAL_KINDS } from './career';
import { publicProfileSchema } from './profile';
import { publicProjectSummarySchema } from './projects';
import { publicCategorySchema, publicTechnologySchema } from './taxonomy';

/**
 * Everything the home and about pages need, in one request.
 * The site is small: one cached payload beats a waterfall of section requests.
 */
export const sitePayloadSchema = z.object({
  locale: localeSchema,
  profile: publicProfileSchema.nullable(),
  featuredProjects: z.array(publicProjectSummarySchema),
  experience: z.array(publicExperienceSchema),
  education: z.array(publicEducationSchema),
  technologies: z.array(publicTechnologySchema),
  categories: z.array(publicCategorySchema),
  certifications: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      issuer: z.string(),
      issuedOn: z.string().nullable(),
      credentialId: z.string().nullable(),
      credentialUrl: z.string().nullable(),
    }),
  ),
  socialLinks: z.array(z.object({ kind: z.enum(SOCIAL_KINDS), label: z.string(), url: z.string() })),
});
export type SitePayload = z.infer<typeof sitePayloadSchema>;

/** Slugs and dates for sitemap.xml. */
export const sitemapEntrySchema = z.object({
  slug: z.string(),
  updatedAt: z.iso.datetime(),
  locales: z.array(z.enum(LOCALES)),
});
export type SitemapEntry = z.infer<typeof sitemapEntrySchema>;
