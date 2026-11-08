import { z } from 'zod';
import { slugSchema, translationsSchema } from './common';
import { localeSchema } from './locales';

/* ── Technologies (also the "skills" shown in the Stack section) ── */

export const TECHNOLOGY_GROUPS = [
  'language',
  'backend',
  'frontend',
  'data',
  'cloud',
  'devops',
  'testing',
  'ai',
  'other',
] as const;
export type TechnologyGroup = (typeof TECHNOLOGY_GROUPS)[number];

export const technologyInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  slug: slugSchema,
  group: z.enum(TECHNOLOGY_GROUPS),
  /** Shown in the public Stack section. Unfeatured technologies only appear on projects. */
  featured: z.boolean(),
});
export type TechnologyInput = z.output<typeof technologyInputSchema>;

export const technologySchema = technologyInputSchema.extend({
  id: z.string(),
  sortOrder: z.number().int(),
  projectCount: z.number().int(),
});
export type Technology = z.infer<typeof technologySchema>;

export const publicTechnologySchema = z.object({
  slug: z.string(),
  name: z.string(),
  group: z.enum(TECHNOLOGY_GROUPS),
});
export type PublicTechnology = z.infer<typeof publicTechnologySchema>;

/* ── Project categories ── */

export const categoryInputSchema = z.object({
  slug: slugSchema,
  translations: translationsSchema({ name: z.string().trim().min(1).max(60) }),
});
export type CategoryInput = z.output<typeof categoryInputSchema>;

export const categorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  sortOrder: z.number().int(),
  projectCount: z.number().int(),
  translations: z.partialRecord(localeSchema, z.object({ name: z.string() })),
});
export type Category = z.infer<typeof categorySchema>;

export const publicCategorySchema = z.object({ slug: z.string(), name: z.string() });
export type PublicCategory = z.infer<typeof publicCategorySchema>;
