import { z } from 'zod';
import { DEFAULT_LOCALE, LOCALES, Locale, localeSchema } from './locales';

export const idSchema = z.string().trim().min(1).max(64);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Use at least 2 characters')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single dashes');

export const httpUrlSchema = z
  .url({ protocol: /^https?$/, message: 'Enter a full http(s) URL' })
  .max(500);

/** Empty strings from form inputs become null, so "clear the field" works naturally. */
const blankToNull = (v: unknown) =>
  v === undefined || (typeof v === 'string' && v.trim() === '') ? null : v;

export const nullableUrlSchema = z.preprocess(
  blankToNull,
  httpUrlSchema.nullable(),
);

export const nullableText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable(),
  );

/** Month precision dates (YYYY-MM): experience and certifications don't need days. */
export const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the format YYYY-MM');

export const yearSchema = z.coerce.number().int().min(1980).max(2100);

export const localeQuerySchema = z.object({
  locale: localeSchema.catch(DEFAULT_LOCALE),
});
export type LocaleQuery = z.output<typeof localeQuerySchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});
export type PaginationQuery = z.output<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  });

/** Every error response from the API has this shape. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const reorderSchema = z.object({
  ids: z
    .array(idSchema)
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, 'Each id can only appear once'),
});
export type ReorderBody = z.output<typeof reorderSchema>;

/**
 * draft     → never published, invisible to visitors
 * published → visitors see exactly what is in the editor
 * changed   → published, but the editor holds newer, unpublished edits
 */
export const PUBLICATION_STATUSES = ['draft', 'published', 'changed'] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const publicationSchema = z.object({
  status: z.enum(PUBLICATION_STATUSES),
  publishedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
});
export type Publication = z.infer<typeof publicationSchema>;

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.every(isBlank);
  return false;
}

/**
 * Drops languages whose fields are all empty, so a dashboard form can render
 * an input for every language while only the filled ones are validated and saved.
 */
export function pruneEmptyTranslations(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [locale, fields] of Object.entries(value as Record<string, unknown>)) {
    if (fields && typeof fields === 'object' && Object.values(fields).every(isBlank)) continue;
    result[locale] = fields;
  }
  return result;
}

/**
 * `{ en: {...}, fr: {...} }` — English required, other languages optional.
 * Empty languages are pruned before validation.
 */
export function translationsSchema<S extends z.ZodRawShape>(shape: S) {
  const item = z.object(shape);
  return z.preprocess(
    pruneEmptyTranslations,
    z
      .partialRecord(localeSchema, item)
      .refine((record) => record[DEFAULT_LOCALE] !== undefined, {
        message: 'The English version is required',
        path: [DEFAULT_LOCALE],
      }),
  );
}

export type Translations<T> = Partial<Record<Locale, T>>;

/** Which languages of an item are filled in — used by the coverage matrix. */
export function translatedLocales(translations: Translations<unknown>): Locale[] {
  return LOCALES.filter((locale) => translations[locale] !== undefined);
}
