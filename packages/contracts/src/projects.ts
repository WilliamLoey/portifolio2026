import { z } from 'zod';
import {
  idSchema,
  nullableText,
  nullableUrlSchema,
  paginationQuerySchema,
  publicationSchema,
  slugSchema,
  translationsSchema,
} from './common';
import { localeSchema } from './locales';
import { publicImageSchema } from './media';
import { publicCategorySchema, publicTechnologySchema } from './taxonomy';

export const projectTranslationShape = {
  title: z.string().trim().min(1, 'Add a title').max(120),
  /** One or two sentences for cards. */
  summary: z.string().trim().min(1, 'Add a short summary').max(280),
  /** Case study body. Markdown. */
  body: z.string().trim().min(1, 'Describe the project').max(20_000),
  /** What William did on this project, e.g. "Backend lead". */
  role: nullableText(120),
  /** Measurable or observable result, only if real. */
  outcome: nullableText(600),
};

export const projectInputSchema = z.object({
  slug: slugSchema,
  categoryId: idSchema.nullable(),
  coverId: idSchema.nullable(),
  repoUrl: nullableUrlSchema,
  liveUrl: nullableUrlSchema,
  year: z.number().int().min(1990).max(2100).nullable(),
  technologyIds: z
    .array(idSchema)
    .max(30)
    .refine((ids) => new Set(ids).size === ids.length, 'Each technology can only appear once'),
  featured: z.boolean(),
  showOnHome: z.boolean(),
  translations: translationsSchema(projectTranslationShape),
});
export type ProjectInput = z.output<typeof projectInputSchema>;
export type ProjectFormValues = z.input<typeof projectInputSchema>;

/** Quick toggles from the project list, applied without a full save. */
export const projectFlagsSchema = z
  .object({ featured: z.boolean(), showOnHome: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one flag');
export type ProjectFlagsBody = z.output<typeof projectFlagsSchema>;

const projectTranslation = z.object({
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  role: z.string().nullable(),
  outcome: z.string().nullable(),
});

export const adminProjectSchema = z.object({
  id: z.string(),
  slug: z.string(),
  categoryId: z.string().nullable(),
  cover: z.object({ id: z.string(), url: z.string() }).nullable(),
  repoUrl: z.string().nullable(),
  liveUrl: z.string().nullable(),
  year: z.number().int().nullable(),
  technologyIds: z.array(z.string()),
  featured: z.boolean(),
  showOnHome: z.boolean(),
  sortOrder: z.number().int(),
  translations: z.partialRecord(localeSchema, projectTranslation),
  publication: publicationSchema,
  createdAt: z.iso.datetime(),
});
export type AdminProject = z.infer<typeof adminProjectSchema>;

export const publicProjectSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  role: z.string().nullable(),
  year: z.number().int().nullable(),
  cover: publicImageSchema.nullable(),
  category: publicCategorySchema.nullable(),
  technologies: z.array(publicTechnologySchema),
  repoUrl: z.string().nullable(),
  liveUrl: z.string().nullable(),
  featured: z.boolean(),
  /** Language the text is written in; differs from the requested locale on fallback. */
  contentLocale: localeSchema,
});
export type PublicProjectSummary = z.infer<typeof publicProjectSummarySchema>;

export const publicProjectSchema = publicProjectSummarySchema.extend({
  body: z.string(),
  outcome: z.string().nullable(),
  publishedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  /** Languages this project is translated into — drives hreflang on the case study page. */
  availableLocales: z.array(localeSchema),
});
export type PublicProject = z.infer<typeof publicProjectSchema>;

export const publicProjectsQuerySchema = paginationQuerySchema.extend({
  locale: localeSchema.catch('en'),
  category: z.string().trim().max(80).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).catch(24),
});
export type PublicProjectsQuery = z.output<typeof publicProjectsQuerySchema>;
