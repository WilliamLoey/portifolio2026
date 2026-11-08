import { z } from 'zod';
import { idSchema, nullableText, nullableUrlSchema, publicationSchema, translationsSchema } from './common';
import { localeSchema } from './locales';
import { publicImageSchema } from './media';

export const LANGUAGE_LEVELS = ['native', 'full_professional', 'professional', 'limited', 'elementary'] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

/** A language William speaks (not a site language). `name` is shown as typed. */
export const spokenLanguageSchema = z.object({
  name: z.string().trim().min(2).max(40),
  level: z.enum(LANGUAGE_LEVELS),
});

export const profileTranslationShape = {
  /** Professional title, e.g. "Backend-focused Software Engineer". */
  role: z.string().trim().min(2, 'Add your professional title').max(80),
  /** One-sentence positioning used in the hero. */
  headline: z.string().trim().min(10, 'Write at least one sentence').max(200),
  /** Longer biography for the About page. Markdown allowed. */
  bio: z.string().trim().min(20, 'Write at least a couple of sentences').max(5000),
  /** Optional short status, e.g. "Open to remote roles in the EU". */
  availability: nullableText(120),
};

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.email('Enter a valid email').trim().max(200),
  location: z.string().trim().min(2).max(80),
  timezone: z
    .string()
    .trim()
    .max(60)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'Use an IANA time zone such as Europe/Brussels'),
  openToWork: z.boolean(),
  resumeUrl: nullableUrlSchema,
  spokenLanguages: z.array(spokenLanguageSchema).max(10),
  translations: translationsSchema(profileTranslationShape),
});
export type UpdateProfileBody = z.output<typeof updateProfileSchema>;
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const setPhotoSchema = z.object({ mediaId: idSchema.nullable() });
export type SetPhotoBody = z.output<typeof setPhotoSchema>;

const profileTranslation = z.object(profileTranslationShape).extend({ availability: z.string().nullable() });

export const adminProfileSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  location: z.string(),
  timezone: z.string(),
  openToWork: z.boolean(),
  resumeUrl: z.string().nullable(),
  spokenLanguages: z.array(spokenLanguageSchema),
  photo: z.object({ id: z.string(), url: z.string() }).nullable(),
  translations: z.partialRecord(localeSchema, profileTranslation),
  publication: publicationSchema,
});
export type AdminProfile = z.infer<typeof adminProfileSchema>;

export const publicProfileSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  location: z.string(),
  timezone: z.string(),
  openToWork: z.boolean(),
  resumeUrl: z.string().nullable(),
  spokenLanguages: z.array(spokenLanguageSchema),
  photo: publicImageSchema.nullable(),
  role: z.string(),
  headline: z.string(),
  bio: z.string(),
  availability: z.string().nullable(),
  /** Language the text fields are actually written in (differs from the request when falling back). */
  contentLocale: localeSchema,
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;
