import { z } from 'zod';
import {
  nullableText,
  nullableUrlSchema,
  publicationSchema,
  translationsSchema,
  yearMonthSchema,
  yearSchema,
} from './common';
import { localeSchema } from './locales';

/* ── Experience ── */

export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'freelance', 'internship'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const experienceTranslationShape = {
  role: z.string().trim().min(1, 'Add your job title').max(120),
  summary: z.string().trim().max(1000),
  highlights: z.array(z.string().trim().min(1).max(300)).max(10),
};

export const experienceInputSchema = z
  .object({
    company: z.string().trim().min(1).max(120),
    companyUrl: nullableUrlSchema,
    location: nullableText(120),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    startDate: yearMonthSchema,
    /** null = current position. */
    endDate: z.preprocess((v) => (v === '' ? null : v), yearMonthSchema.nullable()),
    translations: translationsSchema(experienceTranslationShape),
  })
  .refine((v) => v.endDate === null || v.endDate >= v.startDate, {
    message: 'The end date must be after the start date',
    path: ['endDate'],
  });
export type ExperienceInput = z.output<typeof experienceInputSchema>;
export type ExperienceFormValues = z.input<typeof experienceInputSchema>;

export const adminExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  companyUrl: z.string().nullable(),
  location: z.string().nullable(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  startDate: z.string(),
  endDate: z.string().nullable(),
  sortOrder: z.number().int(),
  translations: z.partialRecord(
    localeSchema,
    z.object({ role: z.string(), summary: z.string(), highlights: z.array(z.string()) }),
  ),
  publication: publicationSchema,
});
export type AdminExperience = z.infer<typeof adminExperienceSchema>;

export const publicExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  companyUrl: z.string().nullable(),
  location: z.string().nullable(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  startDate: z.string(),
  endDate: z.string().nullable(),
  role: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()),
  contentLocale: localeSchema,
});
export type PublicExperience = z.infer<typeof publicExperienceSchema>;

/* ── Education ── */

export const EDUCATION_STATUSES = ['in_progress', 'completed', 'discontinued'] as const;
export type EducationStatus = (typeof EDUCATION_STATUSES)[number];

export const educationTranslationShape = {
  degree: z.string().trim().min(1, 'Add the degree or program name').max(160),
  field: nullableText(160),
  notes: nullableText(1000),
};

export const educationInputSchema = z
  .object({
    institution: z.string().trim().min(1).max(160),
    url: nullableUrlSchema,
    startYear: yearSchema,
    endYear: z.preprocess((v) => (v === '' ? null : v), yearSchema.nullable()),
    status: z.enum(EDUCATION_STATUSES),
    translations: translationsSchema(educationTranslationShape),
  })
  .refine((v) => v.endYear === null || v.endYear >= v.startYear, {
    message: 'The end year must be after the start year',
    path: ['endYear'],
  });
export type EducationInput = z.output<typeof educationInputSchema>;
export type EducationFormValues = z.input<typeof educationInputSchema>;

export const adminEducationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  url: z.string().nullable(),
  startYear: z.number().int(),
  endYear: z.number().int().nullable(),
  status: z.enum(EDUCATION_STATUSES),
  sortOrder: z.number().int(),
  translations: z.partialRecord(
    localeSchema,
    z.object({ degree: z.string(), field: z.string().nullable(), notes: z.string().nullable() }),
  ),
  publication: publicationSchema,
});
export type AdminEducation = z.infer<typeof adminEducationSchema>;

export const publicEducationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  url: z.string().nullable(),
  startYear: z.number().int(),
  endYear: z.number().int().nullable(),
  status: z.enum(EDUCATION_STATUSES),
  degree: z.string(),
  field: z.string().nullable(),
  notes: z.string().nullable(),
  contentLocale: localeSchema,
});
export type PublicEducation = z.infer<typeof publicEducationSchema>;

/* ── Certifications (names are proper nouns: not translated) ── */

export const certificationInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  issuer: z.string().trim().min(1).max(120),
  issuedOn: z.preprocess((v) => (v === '' ? null : v), yearMonthSchema.nullable()),
  credentialId: nullableText(160),
  credentialUrl: nullableUrlSchema,
  visible: z.boolean(),
});
export type CertificationInput = z.output<typeof certificationInputSchema>;
export type CertificationFormValues = z.input<typeof certificationInputSchema>;

export const certificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string(),
  issuedOn: z.string().nullable(),
  credentialId: z.string().nullable(),
  credentialUrl: z.string().nullable(),
  visible: z.boolean(),
  sortOrder: z.number().int(),
});
export type Certification = z.infer<typeof certificationSchema>;
export type PublicCertification = Omit<Certification, 'visible' | 'sortOrder'>;

/* ── Social links ── */

export const SOCIAL_KINDS = ['github', 'linkedin', 'email', 'x', 'website', 'other'] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];

export const socialLinkInputSchema = z
  .object({
    kind: z.enum(SOCIAL_KINDS),
    label: z.string().trim().min(1).max(40),
    url: z.string().trim().min(1).max(500),
    visible: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const ok =
      v.kind === 'email'
        ? z.email().safeParse(v.url.replace(/^mailto:/, '')).success
        : /^https:\/\/[^\s]+$/.test(v.url);
    if (!ok) {
      ctx.addIssue({
        code: 'custom',
        path: ['url'],
        message: v.kind === 'email' ? 'Enter an email address' : 'Enter a full https:// URL',
      });
    }
  });
export type SocialLinkInput = z.output<typeof socialLinkInputSchema>;

export const socialLinkSchema = z.object({
  id: z.string(),
  kind: z.enum(SOCIAL_KINDS),
  label: z.string(),
  url: z.string(),
  visible: z.boolean(),
  sortOrder: z.number().int(),
});
export type SocialLink = z.infer<typeof socialLinkSchema>;
export type PublicSocialLink = Pick<SocialLink, 'kind' | 'label' | 'url'>;
